import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';
import Logger from '../Logger';
import Settings from '../Settings';
import { browser } from 'webextension-polyfill-ts';
import ExtensionMode from '../../../common/enums/ExtensionMode.enum';


class CommsServer {
  server: any;
  logger: Logger;
  settings: Settings;


  ports: {
    [frame: string] : {
      [port: string]: any
    }
  }[] = [];
  popupPort: any;

  commands: {[x: string]: ((a: any, b: any) => void | Promise<void>)[]}

  constructor(server) {
    this.server = server;
    this.logger = server.logger;
    this.settings = server.settings;
    this.popupPort = null;

    browser.runtime.onConnect.addListener(p => this.onConnect(p));
    browser.runtime.onMessage.addListener((m, sender) => this.processReceivedMessage_nonpersistent(m, sender));

    // commands — functions that handle incoming messages
    // functions can have the following arguments, which are, 
    // in this order:
    //       message      — the message we received
    //       port|sender  — on persistent channels, second argument is port on which the server
    //                      listens. If the message was sent in non-persistent way, this is the
    //                      sender script/frame/whatever of the message
    //       sendResponse — callback function on messages received via non-persistent channel
    this.commands = {
      'announce-zoom': [
        (message) => {
          try {
            // forward message to the popup
            this.popupPort.postMessage({cmd: 'set-current-zoom', zoom: message.zoom});
          } catch (e) {
            // if popup is closed, this will/may fail. This is okay, so we just ignore this error
          }
        },
      ],
      'get-current-zoom': [
        (message) => this.sendToActive(message),
      ],
      'get-current-site': [
        async (message, port) => {
          port.postMessage({
            cmd: 'set-current-site',
            site: await this.server.getVideoTab(),
            tabHostname: await this.getCurrentTabHostname()
          });
        },
      ],
      'popup-set-selected-tab': [
        (message) => this.server.setSelectedTab(message.selectedMenu, message.selectedSubitem),
      ],
      'has-video': [
        (message, port) => this.server.registerVideo(port.sender),
      ],
      'noVideo': [
        (message, port) => this.server.unregisterVideo(port.sender),
      ],
      'inject-css': [
        (message, sender) => this.server.injectCss(message.cssString, sender),
      ],
      'eject-css': [
        (message, sender) => this.server.removeCss(message.cssString, sender),
      ],
      'replace-css': [
        (message, sender) => this.server.replaceCss(message.oldCssString, message.newCssString, sender),
      ],
      // 'get-config': [
      //   (message, port) => {
      //     this.logger.log('info', 'comms', "CommsServer: received get-config. Active settings?", this.settings.active, "\n(settings:", this.settings, ")");
      //     port.postMessage(
      //       {cmd: "set-config", conf: this.settings.active, site: this.server.currentSite}
      //     );
      //   },
      // ],
      'get-config': [
        (message, sender) => {
          var ret = {extensionConf: JSON.stringify(this.settings.active)};
          this.logger.log('info', 'comms', "%c[CommsServer.js::processMessage_nonpersistent] Returning this:", "background-color: #11D; color: #aad", ret);
          Promise.resolve(ret);
        }
      ],
      'autoar-enable': [
        () => {
          this.settings.active.sites['@global'].autoar = ExtensionMode.Enabled;
          this.settings.save();
          this.logger.log('info', 'comms', "[uw-bg] autoar set to enabled (blacklist). evidenz:", this.settings.active);
        }
      ],
      'autoar-disable': [
        (message) => {
          this.settings.active.sites['@global'].autoar = ExtensionMode.Disabled;
          if (message.reason){
            this.settings.active.arDetect.disabledReason = message.reason;
          } else {
            this.settings.active.arDetect.disabledReason = 'User disabled';
          }
          this.settings.save();
          this.logger.log('info', 'comms', "[uw-bg] autoar set to disabled. evidenz:", this.settings.active);
        }
      ],
      'autoar-set-interval': [
        (message) => {
          this.logger.log('info', 'comms', `[uw-bg] trying to set new interval for autoAr. New interval is, ${message.timeout} ms`);
      
          // set fairly liberal limit
          var timeout = message.timeout < 4 ? 4 : message.timeout;
          this.settings.active.arDetect.timers.playing = timeout;
          this.settings.save();
        }
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

  sendToAll(message){
    for(const tab of this.ports){
      for(const frame in tab){
        for (const port in tab[frame]) {
          tab[frame][port].postMessage(message);
        }
      }
    }
  }

  get activeTab() {
    return browser.tabs.query({currentWindow: true, active: true});
  }

  /**
   * Sends a message to addon content scripts.
   * @param message message
   * @param tab the tab we want to send the message to
   * @param frame the frame within that tab that we want to send the message to
   * @param port if defined, message will only be sent to that specific script, otherwise it gets sent to all scripts of a given frame
   */
  async sendToFrameContentScripts(message, tab, frame, port?) {
    if (port !== undefined) {
      this.ports[tab][frame][port].postMessage(message);
      return;
    }
    for (const framePort in this.ports[tab][frame]) {
      this.ports[tab][frame][framePort].postMessage(message);
    }
  }

  async sendToFrame(message, tab, frame, port?) {
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

  async sendToAllFrames(message, tab, port) {
    for (const frame in this.ports[tab]) {
      this.sendToFrameContentScripts(message, tab, frame, port);
    }
  }

  async sendToActive(message) {
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
    // poseben primer | special case
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


  // TODO: sendResponse seems redundant — it used to be a callback for
  // chrome-based browsers, but browser polyfill doesn't do callback. Just
  // awaits.
  async execCmd(message, portOrSender, sendResponse?) {
    this.logger.log(
      'info', 'comms', '[CommsServer.js::execCmd] Received message', message,
      ". Port/sender:", portOrSender, "sendResponse:", sendResponse, "\nThere is ", this.commands[message.cmd]?.length ?? 0,
      " command(s) for action", message.cmd
    );
    if (this.commands[message.cmd]) {
      for (const c of this.commands[message.cmd]) {
        try {
          await c(message, portOrSender);
        } catch (e) {
          this.logger.log('error', 'debug', "[CommsServer.js::execCmd] failed to execute command.", e)
        }
      }
    }
  }

  async handleMessage(message, portOrSender) {
    await this.execCmd(message, portOrSender);
    
    if (message.forwardToSameFramePort) {
      this.sendToFrameContentScripts(message, portOrSender.tab.id, portOrSender.frameId, message.port)
    }
    if (message.forwardToContentScript) {
      this.logger.log('info', 'comms', "[CommsServer.js::processReceivedMessage] Message has 'forward to content script' flag set. Forwarding message as is. Message:", message);
      this.sendToFrame(message, message.targetTab, message.targetFrame);
    }
    if (message.forwardToAll) {
      this.logger.log('info', 'comms', "[CommsServer.js::processReceivedMessage] Message has 'forward to all' flag set. Forwarding message as is. Message:", message);
      this.sendToAll(message);
    }
    if (message.forwardToActive) {
      this.logger.log('info', 'comms', "[CommsServer.js::processReceivedMessage] Message has 'forward to active' flag set. Forwarding message as is. Message:", message);
      this.sendToActive(message);
    }
  }

  async processReceivedMessage(message, port){
    this.logger.log('info', 'comms', "[CommsServer.js::processReceivedMessage] Received message from popup/content script!", message, "port", port);

    this.handleMessage(message, port)
  }

  processReceivedMessage_nonpersistent(message, sender){
    this.logger.log('info', 'comms', "%c[CommsServer.js::processMessage_nonpersistent] Received message from background script!", "background-color: #11D; color: #aad", message, sender);
    
    this.handleMessage(message, sender);
  }

  // chrome shitiness mitigation
  sendUnmarkPlayer(message) {
    this.logger.log('info', 'comms', '[CommsServer.js::sendUnmarkPlayer] Chrome is a shit browser that doesn\'t do port.postMessage() in unload events, so we have to resort to inelegant hacks. If you see this, then the workaround method works.');
    this.processReceivedMessage(message, this.popupPort);
  }
}

export default CommsServer;
