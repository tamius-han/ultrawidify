import { ExtensionEnvironment } from './../../../common/interfaces/SettingsInterface';
import { ComponentLogger } from '@src/ext/module/logging/ComponentLogger';
import Settings from '@src/ext/module/settings/Settings';
import EventBus from '@src/ext/module/EventBus';
import UWServer from '@src/ext/UWServer';
import { HostInfo } from '@src/common/interfaces/HostData.interface';
import { CommsMessage } from '@src/ext/module/comms/comms-message.interface';
import { CommsOrigin } from '@src/ext/module/comms/comms-origin.enum';
import { EventBusContext } from '@src/common/interfaces/EventBusMessage.interface';

type CommsServerContext = EventBusContext & {
  tab?: number;
  frame?: number | '__playing' | '__all';
  port?: string;
};
type CommsSourceFrame = { tabId: number; frameId: number };

const BASE_LOGGING_STYLES = {
  log: "background-color: #11D; color: #aad",
};

class CommsServer {
  server: UWServer;
  logger: ComponentLogger;
  settings: Settings;
  eventBus: EventBus;

  /**
   * We can send messages to various ports.
   *
   * Ports start with a list of browser tabs (one for every tab of the browser), and each contain
   * a list of frames. Content of the tab is a frame, and so are any iframes inside the tab. Each
   * frame has at least one script (that's us 👋👋👋).
   *
   * For a page with no iframes, the ports object should look like this:
   *
   * ports
   *  :
   *  +-+ [our tab]
   *  | +-+ [the only frame]
   *  :   +-- [the only port]
   *
   * For a page with iframes, the ports object should look like this:
   *
   * ports
   *  :
   *  +-+ [our tab]
   *  | +-+ [main frame]
   *  | | +-- [content script]
   *  | |
   *  | +-+ [iframe]
   *  | | +-- [content script]
   *  : :
   *
   * And, again, we always need to call the content script.
   */
  ports: Map<number, Map<number, Map<string, chrome.runtime.Port>>> = new Map();
  popupPort?: chrome.runtime.Port;

  private _lastActiveTab: chrome.tabs.Tab | undefined;
  //#region getters
  get activeTab(): Promise<chrome.tabs.Tab | undefined> {
    return new Promise((resolve, reject) => {
      chrome.tabs
        .query({currentWindow: true, active: true})
        .then((tabs) => {
          if (tabs.length === 0) {
            this.logger.warn('<getter-activeTab>', 'no active tab found, returning last valid active tab instead ...', this._lastActiveTab);
            resolve(this._lastActiveTab);
          } else {
            this.logger.log('<getter-activeTab>', 'getting active tab', tabs[0]);
            this._lastActiveTab = tabs[0];
            resolve(tabs[0]);
          }
        })
        .catch((err) => {
          this.logger.error('<getter-activeTab>', 'error while getting active tab — returned last valid active tab instead ...', err, this._lastActiveTab);
          resolve(this._lastActiveTab);
        });
    });
  }
  //#endregion

  //#region lifecycle
  constructor(server: UWServer) {
    this.server = server;
    this.logger = new ComponentLogger(server.logAggregator, 'CommsServer', {styles: BASE_LOGGING_STYLES});
    this.settings = server.settings;
    this.eventBus = server.eventBus;

    chrome.runtime.onConnect.addListener(p => this.onConnect(p));
    chrome.runtime.onMessage.addListener((m: CommsMessage, sender: chrome.runtime.MessageSender) => this.processReceivedMessage_nonpersistent(m, sender));
  }

  private onConnect(port: chrome.runtime.Port){
    // special case
    if (port.name === 'popup-port') {
      this.popupPort = port;
      this.popupPort.onMessage.addListener((m: CommsMessage, p: chrome.runtime.Port) => this.processReceivedMessage(m, p));
      port.onDisconnect.addListener(() => {
        if (this.popupPort === port) {
          this.popupPort = undefined;
        }
      });
      return;
    }

    const tabId = port.sender?.tab?.id;
    const frameId = port.sender?.frameId;
    if (tabId === undefined || frameId === undefined) {
      this.logger.warn('onConnect', 'port does not have a valid tabId or frameId', port.sender);
      return;
    }

    let tabPorts = this.ports.get(tabId);
    if (!tabPorts) {
      tabPorts = new Map();
      this.ports.set(tabId, tabPorts);
    }
    let framePorts = tabPorts.get(frameId);
    if (!framePorts) {
      framePorts = new Map();
      tabPorts.set(frameId, framePorts);
    }
    framePorts.set(port.name, port);
    port.onMessage.addListener((m: CommsMessage, p: chrome.runtime.Port) => this.processReceivedMessage(m, p, {tabId, frameId}));
    if (port.name === 'content-main-port') {
      setTimeout(() => {
        if (this.ports.get(tabId)?.get(frameId)?.get(port.name) === port) {
          port.postMessage({command: 'restore-background-state'});
        }
      }, 0);
    }

    port.onDisconnect.addListener(() => {
      framePorts.delete(port.name);
      if (framePorts.size === 0) {
        tabPorts.delete(frameId);
        if (tabPorts.size === 0) {
          this.ports.delete(tabId);
        }
      }
    });
  }

  //#endregion

  /**
   * Lists all unique hosts that are present in all the frames of a given tab.
   * This includes both hostname of the tab, as well as of all iframes embedded in it.
   * @returns
   */
  async listUniqueFrameHosts() {
    const aTab = await this.activeTab;
    if (aTab?.id === undefined) {
      return [];
    }

    const tabPorts = this.ports.get(aTab.id);
    if (!tabPorts) {
      return [];
    }
    const hosts: string[] = [];

    for (const framePorts of tabPorts.values()) {
      for (const port of framePorts.values()) {
        const host = port.sender?.origin?.split('://')[1];

        // if host is invalid or already exists in our list, skip adding it
        if (!host || hosts.includes(host)) {
          continue;
        }

        hosts.push(host);
      }
    }

    return hosts;
  }

  async getUniqueFrameHosts() {
    const aTab = await this.activeTab;

    const tabPorts = aTab?.id === undefined ? undefined : this.ports.get(aTab.id);
    const hosts:  HostInfo[] = [];


  }

  sendMessage(message: CommsMessage, context?: CommsServerContext) {
    this.logger.debug('sendMessage', `preparing to send message ${message.command ?? ''} ...`, {message, context});
    // stop messages from returning where they came from, and prevent
    // cross-pollination between content scripts running in different
    // tabs.
    if (!context) {
      this.logger.debug('sendMessage', 'context was not passed in as parameter - does message have context?', message.context);
      context = message.context;
    }

    /**
     * Here's how message forwarding works:
     *  * messages NOT originating from a content script get forwarded to content script
     *  * messages NOT originating from extension popup get forwarded to extension popup
     *
     * This way, messages originating from background script get forwarded both to
     * content script as well as popup for absolutely free.
     */

    forwardToContentScript:
    {
      if (context?.origin !== CommsOrigin.ContentScript) {
        if (context?.comms?.forwardTo === 'all') {
          this.sendToAll(message);
          break forwardToContentScript;
        }
        if (context?.comms?.forwardTo === 'active') {
          this.sendToActive(message);
          break forwardToContentScript;
        }
        if (context?.comms?.forwardTo === 'contentScript' && context.tab !== undefined && context.frame !== undefined) {
          this.sendToFrame(message, context.tab, context.frame, context.port);
          break forwardToContentScript;
        }

        this.sendToActive(message);
        break forwardToContentScript;
      }
    }

    if (context?.origin !== CommsOrigin.Popup) {
      this.sendToPopup(message);
    }

    // okay I lied! Messages originating from content script can be forwarded to
    // content scripts running in _other_ frames of the tab.
    if (context?.origin === CommsOrigin.ContentScript) {
      if (context?.comms?.forwardTo === 'all-frames') {
        this.sendToOtherFrames(message, context);
      }
    }
  }

  /**
   * Sends a message to popup script
   */
  sendToPopup(message: CommsMessage) {
    this.popupPort?.postMessage(message);
  }

  /**
   * sends a message to ALL **CONTENT SCRIPTS**
   * Does NOT send a message to popup.
   **/
  private sendToAll(message: CommsMessage){
    this.logger.info('sendToAll', "sending message to all content scripts", message);

    for (const [tabId, tabPorts] of this.ports) {
      for (const [frameId, framePorts] of tabPorts) {
        for (const [portName, port] of framePorts) {
          this.logger.info('sendToAll', `      <——— attempting to send message ${message.command ?? ''} to tab ${tabId}, frame ${frameId}, port ${portName}`, message);
          port.postMessage(message);
        }
      }
    }
  }

  /**
   * Sends a message to addon content scripts in a single browser tab.
   * @param message message
   * @param tab the tab we want to send the message to
   * @param frame the frame within that tab that we want to send the message to
   * @param port if defined, message will only be sent to that specific script, otherwise it gets sent to all scripts of a given frame
   */
  private async sendToFrameContentScripts(message: CommsMessage, tab: number, frame: number, port?: string) {
    const framePorts = this.ports.get(tab)?.get(frame);
    if (!framePorts) {
      return;
    }

    if (port !== undefined) {
      framePorts.get(port)?.postMessage(message);
      this.logger.info('sendToOtherFrames', `      <——— attempting to send message ${message.command ?? ''} to tab ${tab}, frame ${frame}, port ${port}`, message);
      return;
    }
    for (const framePort of framePorts.values()) {
      this.logger.info('sendToOtherFrames', `      <——— attempting to send message ${message.command ?? ''} to tab ${tab}, frame ${frame}`, message);
      framePort.postMessage(JSON.parse(JSON.stringify(message)));
    }
  }

  /**
   * Forwards messages to other content scripts within the same tab
   * @param message
   * @param tab
   * @param frame
   */
  private async sendToOtherFrames(message: CommsMessage, context: CommsServerContext) {
    const sender = context.comms?.sourceFrame;
    if (!sender) {
      return;
    }

    const enrichedMessage: CommsMessage = {
      ...message,
      _sourceFrame: sender,
      _sourcePort: context.comms?.port
    }

    const tabPorts = this.ports.get(sender.tabId);
    if (!tabPorts) {
      return;
    }
    for (const frameId of tabPorts.keys()) {
      if (frameId !== sender.frameId) {
        this.sendToFrameContentScripts(enrichedMessage, sender.tabId, frameId);
      }
    }
  }

  private async sendToFrame(message: CommsMessage, tab: number, frame: number | '__playing' | '__all', port?: string) {
    this.logger.info('sendToFrame', `      <——— attempting to send message ${message.command ?? ''} to tab ${tab}, frame ${frame}`, message);

    if (frame === '__playing') {
      (message as CommsMessage & { playing?: boolean }).playing = true;
      this.sendToAll(message);
      return;
    } else if (frame === '__all') {
      this.sendToAll(message);
      return;
    }

    this.logger.info('sendToFrame', `      <——— attempting to send message ${message.command ?? ''} to tab ${tab}, frame ${frame}`, message);

    try {

      this.sendToFrameContentScripts(message, tab, frame, port);
    } catch (e) {
      this.logger.error('sendToFrame', ` Sending message failed. Reason:`, e);
    }
  }

  private async sendToActive(message: CommsMessage) {
    this.logger.info('sendToActive', `      <——— trying to send a message ${message.command ?? ''} to active tab. Message:`, message);

    const tab = await this.activeTab;
    if (tab?.id === undefined) {
      // this.logger.warn('sendToActive', "No active tab found.");
      return;
    }

    this.logger.info('sendToActive', "currently active tab?", tab);

    const tabPorts = this.ports.get(tab.id);
    if (!tabPorts) {
      return;
    }
    for (const [frameId, framePorts] of tabPorts) {
      this.logger.info('sendToActive', "sending message to frame:", frameId, framePorts, '; message:', message);
      this.sendToFrameContentScripts(message, tab.id, frameId);
    }
  }


  private async processReceivedMessage(
    message: CommsMessage,
    port: chrome.runtime.Port,
    sender?: CommsSourceFrame
  ){
    await this.server.ready;
    this.logger.info('processMessage', `                   ==> Received message ${message.command ?? ''} from content script or port`, "background-color: #11D; color: #aad", message, port, sender);
    // this triggers events
    this.eventBus.send(
      message.command,
      message.config,
      {
        ...message.context,
        comms: {
          ...message.context?.comms,
          port,
          sourceFrame: sender,
        },

        // origin is required to stop cross-pollination between content scripts, while still
        // preserving the ability to send messages directly between popup and content scripts
        origin: port.name === 'popup-port' ? CommsOrigin.Popup : CommsOrigin.ContentScript
      }
    );
  }

  private async processReceivedMessage_nonpersistent(
    message: CommsMessage,
    sender: chrome.runtime.MessageSender
  ): Promise<void> {
    await this.server.ready;
    this.logger.info('processMessage_nonpersistent', `                   ==> Received message in background script!`, message, sender);

    this.eventBus.send(
      message.command,
      message.config,
      {
        ...message.context,
        comms: {
          ...message.context?.comms,
          sender
        },
        origin: CommsOrigin.Server
      }
    );
  }
}

export default CommsServer;
