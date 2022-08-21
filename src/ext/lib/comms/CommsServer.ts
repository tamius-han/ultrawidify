import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';
import Logger from '../Logger';
import Settings from '../Settings';
import { browser } from 'webextension-polyfill-ts';
import ExtensionMode from '../../../common/enums/ExtensionMode.enum';
import EventBus from '../EventBus';


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

  /**
   * commands — functions that handle incoming messages
   * functions can have the following arguments, which are,
   * in this order:
   *       message      — the message we received
   *       port|sender  — on persistent channels, second argument is port on which the server
   *                      listens. If the message was sent in non-persistent way, this is the
   *                      sender script/frame/whatever of the message
   *       sendResponse — callback function on messages received via non-persistent channel
   */
  commands: {[x: string]: ((a: any, b: any) => void | Promise<void>)[]} = {
    'get-current-site': [
      async (message, port) => {
        port.postMessage({
          cmd: 'set-current-site',
          site: await this.server.getVideoTab(),
          tabHostname: await this.getCurrentTabHostname()
        });
      },
    ],

    'logging-stop-and-save': [  // TODO: possibly never used/superseded — check
      (message, sender) => {
        this.logger.log('info', 'comms', "Received command to stop logging and export the received input");
        this.logger.addToGlobalHistory(`${message.host}::${sender?.tab?.id ?? '×'}-${sender.frameId ?? '×'}`, JSON.parse(message.history));
        this.logger.finish();
      }
    ],
    'logging-save': [
      (message, sender) => {
        this.logger.log('info', 'comms', `Received command to save log for site ${message.host} (tabId ${sender.tab.id}, frameId ${sender.frameId}`);
        this.logger.addToGlobalHistory(`${message?.host}::${sender?.tab?.id ?? '×'}-${sender?.frameId ?? '×'}`, JSON.parse(message.history));
      }
    ]
  }


  //#region getters
  get activeTab() {
    return browser.tabs.query({currentWindow: true, active: true});
  }
  //#endregion

  constructor(server) {
    this.server = server;
    this.logger = server.logger;
    this.settings = server.settings;
    this.eventBus = server.eventBus;

    browser.runtime.onConnect.addListener(p => this.onConnect(p));
    browser.runtime.onMessage.addListener((m, sender) => this.processReceivedMessage_nonpersistent(m, sender));
  }

  subscribe(command, callback) {
    if (!this.commands[command]) {
      this.commands[command] = [callback];
    } else {
      this.commands[command].push(callback);
    }
  }

  async getCurrentTabHostname() {
    const activeTab = await this.activeTab;

    if (!activeTab || activeTab.length < 1) {
      this.logger.log('warn', 'comms', 'There is no active tab for some reason. activeTab:', activeTab);
    }

    const url = activeTab[0].url;

    var hostname;

    if (url.indexOf("://") > -1) {    //find & remove protocol (http, ftp, etc.) and get hostname
      hostname = url.split('/')[2];
    }
    else {
      hostname = url.split('/')[0];
    }

    hostname = hostname.split(':')[0];   //find & remove port number
    hostname = hostname.split('?')[0];   //find & remove "?"

    return hostname;
  }

  sendMessage(message, context) {
    if (context?.forwardTo === 'all') {
      return this.sendToAll(message);
    }
    if (context?.forwardTo === 'active') {
      return this.sendToActive(message);
    }
    if (context?.forwardTo === 'contentScript') {
      return this.sendToFrame(message, context.tab, context.frame, context.port);
    }
  }

  sendToAll(message){
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
   * Sends a message to addon content scripts.
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

  onConnect(port){
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

  async processReceivedMessage(message, port){
    this.logger.log('info', 'comms', "[CommsServer.js::processReceivedMessage] Received message from popup/content script!", message, "port", port);

    this.eventBus.send(message.command, message.config, {comms: {port}, fromComms: true});
  }

  processReceivedMessage_nonpersistent(message, sender){
    this.logger.log('info', 'comms', "%c[CommsServer.js::processMessage_nonpersistent] Received message from background script!", "background-color: #11D; color: #aad", message, sender);

    this.eventBus.send(message.command, message.config, {comms: {sender}, fromComms: true});
  }

  // chrome shitiness mitigation
  sendUnmarkPlayer(message) {
    this.logger.log('info', 'comms', '[CommsServer.js::sendUnmarkPlayer] Chrome is a shit browser that doesn\'t do port.postMessage() in unload events, so we have to resort to inelegant hacks. If you see this, then the workaround method works.');
    this.processReceivedMessage(message, this.popupPort);
  }
}

export default CommsServer;
