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

  ports: {
    [tab: string] : {
      [frame: string] : {
        [port: string]: any
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
    this.ports[tabId][frameId][port.name].onMessage.addListener( (m,p) => this.processReceivedMessage(m, p));

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

    console.log('sendmessage of comms server. Received message:', message, 'and context:', context);

    if (context?.origin !== CommsOrigin.ContentScript) {
      console.log('origin is NOT content script. This means forwarding to content scripts is okay!');
      if (context?.comms.forwardTo === 'all') {
        return this.sendToAll(message);
      }
      if (context?.comms.forwardTo === 'active') {
        console.log('forwarding message to active tab:', message);
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
      this.ports[tab][frame][framePort].postMessage(message);
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

  private async processReceivedMessage(message, port){
    console.log('processing received message!', {message, portName: port.name, port})

    // this triggers events
    this.eventBus.send(
      message.command,
      message.config,
      {
        ...message.context,
        comms: {
          ...message.context?.comms,
          port
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
      message.config, {
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
