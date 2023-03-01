import { EventBusContext } from './../EventBus';
import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';
import Logger from '../Logger';
import Settings from '../Settings';
import { browser } from 'webextension-polyfill-ts';
import ExtensionMode from '../../../common/enums/ExtensionMode.enum';
import EventBus from '../EventBus';
import { CommsOrigin } from './CommsClient';


class CommsServer {
  server: any;
  logger: Logger;
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

  //#region getters
  get activeTab() {
    return browser.tabs.query({currentWindow: true, active: true});
  }
  //#endregion

  //#region lifecycle
  constructor(server) {
    this.server = server;
    this.logger = server.logger;
    this.settings = server.settings;
    this.eventBus = server.eventBus;

    browser.runtime.onConnect.addListener(p => this.onConnect(p));
    browser.runtime.onMessage.addListener((m, sender) => this.processReceivedMessage_nonpersistent(m, sender));
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

  sendMessage(message, context?) {
    // stop messages from returning where they came from, and prevent
    // cross-pollination between content scripts running in different
    // tabs.

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
    if (context?.origin === CommsOrigin.ContentScript) {
      if (context?.comms.forwardTo === 'all-frames') {
        this.sendToOtherFrames(message, context);
      }
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
    for(const tid in this.ports){
      const tab = this.ports[tid];
      for(const frame in tab){
        for (const port in tab[frame]) {
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
      return;
    }
    for (const framePort in this.ports[tab][frame]) {
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

    for (const frame in this.ports[sender.tabId]) {
      if (frame !== sender.frameId) {
        this.sendToFrameContentScripts(message, sender.tabId, sender.frameId);
      }
    }
  }

  private async sendToFrame(message, tab, frame, port?) {
    this.logger.log('info', 'comms', `%c[CommsServer::sendToFrame] attempting to send message to tab ${tab}, frame ${frame}`, "background: #dda; color: #11D", message);

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

    this.logger.log('info', 'comms', `%c[CommsServer::sendToFrame] attempting to send message to tab ${tab}, frame ${frame}`, "background: #dda; color: #11D", message);

    try {

      this.sendToFrameContentScripts(message, tab, frame, port);
    } catch (e) {
      this.logger.log('error', 'comms', `%c[CommsServer::sendToFrame] Sending message failed. Reason:`, "background: #dda; color: #11D", e);
    }
  }

  private async sendToActive(message) {
    this.logger.log('info', 'comms', "%c[CommsServer::sendToActive] trying to send a message to active tab. Message:", "background: #dda; color: #11D", message);

    const tabs = await this.activeTab;

    this.logger.log('info', 'comms', "[CommsServer::_sendToActive] currently active tab(s)?", tabs);
    for (const frame in this.ports[tabs[0].id]) {
      this.logger.log('info', 'comms', "key?", frame, this.ports[tabs[0].id]);
    }

    for (const frame in this.ports[tabs[0].id]) {
      this.sendToFrameContentScripts(message, tabs[0].id, frame);
    }
  }


  private async processReceivedMessage(message, port, sender?: {frameId: string, tabId: string}){
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
    this.logger.log('info', 'comms', "%c[CommsServer.js::processMessage_nonpersistent] Received message from background script!", "background-color: #11D; color: #aad", message, sender);

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
