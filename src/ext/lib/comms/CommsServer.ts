import { ComponentLogger } from './../logging/ComponentLogger';
import Settings from '../settings/Settings';
import EventBus from '../EventBus';
import { CommsOrigin } from './CommsClient';


const BASE_LOGGING_STYLES = {
  log: "background-color: #11D; color: #aad",
};

class CommsServer {
  server: any;
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
  ports: {
    [tab: string] : {           // tab of a browser
      [frame: string] : {       // iframe inside of the tab
        [port: string]: any     // script inside the iframe.
      }
    }
  } = {};
  popupPort: any;

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
        });
    });
  }
  //#endregion

  //#region lifecycle
  constructor(server) {
    this.server = server;
    this.logger = new ComponentLogger(server.logAggregator, 'CommsServer', {styles: BASE_LOGGING_STYLES});
    this.settings = server.settings;
    this.eventBus = server.eventBus;

    chrome.runtime.onConnect.addListener(p => this.onConnect(p));
    chrome.runtime.onMessage.addListener((m, sender) => this.processReceivedMessage_nonpersistent(m, sender));
  }

  private onConnect(port){
    // special case
    if (port.name === 'popup-port') {
      this.popupPort = port;
      this.popupPort.onMessage.addListener( (m,p) => this.processReceivedMessage(m,p));
      return;
    }

    var tabId = port.sender.tab.id;
    var frameId = port.sender.frameId;
    if (! this.ports[tabId]){
      this.ports[tabId] = {};
    }
    if (! this.ports[tabId][frameId]) {
      this.ports[tabId][frameId] = {};
    }
    this.ports[tabId][frameId][port.name] = port;
    this.ports[tabId][frameId][port.name].onMessage.addListener( (m,p) => this.processReceivedMessage(m, p, {tabId, frameId}));

    this.ports[tabId][frameId][port.name].onDisconnect.addListener( (p) => {
      try {
        delete this.ports[p.sender.tab.id][p.sender.frameId][port.name];
      } catch (e) {
        // no biggie if the thing above doesn't exist.
      }
      if (Object.keys(this.ports[tabId][frameId].length === 0)) {
        delete this.ports[tabId][frameId];
        if(Object.keys(this.ports[p.sender.tab.id]).length === 0) {
          delete this.ports[tabId];
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

    const tabPort = this.ports[aTab.id];
    const hosts = [];

    for (const frame in tabPort) {
      for (const portName in tabPort[frame]) {
        const port = tabPort[frame][portName];

        const host =  port.sender.origin.split('://')[1];

        // if host is invalid or already exists in our list, skip adding it
        if (!host || hosts.includes(host)) {
          continue;
        }

        hosts.push(host);
      }
    }

    return hosts;
  }

  sendMessage(message, context?) {
    this.logger.debug('sendMessage', `preparing to send message ${message.command ?? ''} ...`, {message, context});
    // stop messages from returning where they came from, and prevent
    // cross-pollination between content scripts running in different
    // tabs.
    if (!context) {
      this.logger.debug('sendMessage', 'context was not passed in as parameter - does message have context?', message.context);
      context = message.context;
    }

    if (context?.origin !== CommsOrigin.ContentScript) {
      if (context?.comms.forwardTo === 'all') {
        return this.sendToAll(message);
      }
      if (context?.comms.forwardTo === 'active') {
        return this.sendToActive(message);
      }
      if (context?.comms.forwardTo === 'contentScript') {
        return this.sendToFrame(message, context.tab, context.frame, context.port);
      }
    }
    if (context?.origin !== CommsOrigin.Popup) {
      if (context?.comms.forwardTo === 'popup') {
        return this.sendToPopup(message);
      }
    }

    // okay I lied! Messages originating from content script can be forwarded to
    // content scripts running in _other_ frames of the tab
    let forwarded = false;
    if (context?.origin === CommsOrigin.ContentScript) {
      if (context?.comms.forwardTo === 'all-frames') {
        forwarded = true;
        this.sendToOtherFrames(message, context);
      }
    }
    if (!forwarded) {
      this.logger.warn('sendMessage', `message ${message.command ?? ''} was not forwarded to any destination!`,  {message, context});
    }
  }

  /**
   * Sends a message to popup script
   */
  sendToPopup(message) {
    this.popupPort.postMessage(message);
  }

  /**
   * sends a message to ALL **CONTENT SCRIPTS**
   * Does NOT send a message to popup.
   **/
  private sendToAll(message){
    this.logger.info('sendToAll', "sending message to all content scripts", message);

    for(const tid in this.ports){
      const tab = this.ports[tid];
      for(const frame in tab){
        for (const port in tab[frame]) {
          this.logger.info('sendToAll', `      <——— attempting to send message ${message.command ?? ''} to tab ${tab}, frame ${frame}, port ${port}`, message);
          tab[frame][port].postMessage(message);
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
  private async sendToFrameContentScripts(message, tab, frame, port?) {
    if (port !== undefined) {
      this.ports[tab][frame][port].postMessage(message);
      this.logger.info('sendToOtherFrames', `      <——— attempting to send message ${message.command ?? ''} to tab ${tab}, frame ${frame}, port ${port}`, message);
      return;
    }
    for (const framePort in this.ports[tab][frame]) {
      this.logger.info('sendToOtherFrames', `      <——— attempting to send message ${message.command ?? ''} to tab ${tab}, frame ${frame}`, message);
      this.ports[tab][frame][framePort].postMessage(JSON.parse(JSON.stringify(message)));
    }
  }

  /**
   * Forwards messages to other content scripts within the same tab
   * @param message
   * @param tab
   * @param frame
   */
  private async sendToOtherFrames(message, context) {
    const sender = context.comms.sourceFrame;

    const enrichedMessage = {
      message,
      _sourceFrame: context.comms.sourceFrame,
      _sourcePort: context.comms.port
    }

    for (const frame in this.ports[sender.tabId]) {
      if (frame !== sender.frameId) {
        this.sendToFrameContentScripts(enrichedMessage, sender.tabId, sender.frameId);
      }
    }
  }

  private async sendToFrame(message, tab, frame, port?) {
    this.logger.info('sendToFrame', `      <——— attempting to send message ${message.command ?? ''} to tab ${tab}, frame ${frame}`, message);

    if (isNaN(tab)) {
      if (frame === '__playing') {
        message['playing'] = true;
        this.sendToAll(message);
        return;
      } else if (frame === '__all') {
        this.sendToAll(message);
        return;
      }
      [tab, frame] = frame.split('-');
    }

    this.logger.info('sendToFrame', `      <——— attempting to send message ${message.command ?? ''} to tab ${tab}, frame ${frame}`, message);

    try {

      this.sendToFrameContentScripts(message, tab, frame, port);
    } catch (e) {
      this.logger.error('sendToFrame', ` Sending message failed. Reason:`, e);
    }
  }

  private async sendToActive(message) {
    this.logger.info('sendToActive', `      <——— trying to send a message ${message.command ?? ''} to active tab. Message:`, message);

    const tab = await this.activeTab;

    this.logger.info('sendToActive', "currently active tab?", tab);

    for (const frame in this.ports[tab.id]) {
      this.logger.info('sendToActive', "sending message to frame:", frame, this.ports[tab.id][frame], '; message:', message);
      this.sendToFrameContentScripts(message, tab.id, frame);
    }
  }


  private async processReceivedMessage(message, port, sender?: {frameId: string, tabId: string}){
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

  private processReceivedMessage_nonpersistent(message, sender){
    this.logger.info('processMessage_nonpersistent', `                   ==> Received message from background script!`, message, sender);

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
