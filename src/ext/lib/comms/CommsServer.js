import Debug from '../../conf/Debug';
import BrowserDetect from '../../conf/BrowserDetect';

class CommsServer {
  constructor(server) {
    this.server = server;
    this.logger = server.logger;
    this.settings = server.settings;
    this.ports = [];
    this.popupPort = null;

    var ths = this;

    if (BrowserDetect.firefox) {
      browser.runtime.onConnect.addListener(p => ths.onConnect(p));
      browser.runtime.onMessage.addListener((m, sender) => ths.processReceivedMessage_nonpersistent(m, sender));
    } else {
      chrome.runtime.onConnect.addListener(p => ths.onConnect(p));
      chrome.runtime.onMessage.addListener((m, sender, callback) => ths.processReceivedMessage_nonpersistent(m, sender, callback));
    }

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
      'get-config': [
        (message, port) => {
          this.logger.log('info', 'comms', "CommsServer: received get-config. Active settings?", this.settings.active, "\n(settings:", this.settings, ")");
          port.postMessage(
            {cmd: "set-config", conf: this.settings.active, site: this.server.currentSite}
          );
        },
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
      'get-config': [
        (message, sender, sendResponse) => {
          if (BrowserDetect.firefox) {
            var ret = {extensionConf: JSON.stringify(this.settings.active)};
            this.logger.log('info', 'comms', "%c[CommsServer.js::processMessage_nonpersistent] Returning this:", "background-color: #11D; color: #aad", ret);
            Promise.resolve(ret);
          } else {
            sendResponse({extensionConf: JSON.stringify(this.settings.active)});
            return true;
          }
        }
      ],
      'autoar-enable': [
        () => {
          this.settings.active.sites['@global'].autoar = "blacklist";
          this.settings.save();
          this.logger.log('info', 'comms', "[uw-bg] autoar set to enabled (blacklist). evidenz:", this.settings.active);
        }
      ],
      'autoar-disable': [
        (message) => {
          this.settings.active.sites['@global'].autoar = "disabled";
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
          this.settings.active.arDetect.timer_playing = timeout;
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
    const activeTab = await this._getActiveTab();

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
    for(var p of this.ports){
      for(var frame in p){
        p[frame].postMessage(message);
      }
    }
  }

  async _getActiveTab() {
    if (BrowserDetect.firefox) {
      return await browser.tabs.query({currentWindow: true, active: true});
    } else {
      return await new Promise( (resolve, reject) => {
        chrome.tabs.query({lastFocusedWindow: true, active: true}, function (res) {
          resolve(res);
          return true;
        });
      });
    }
  }

  async sendToFrame(message, tab, frame) {
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
      [tab, frame] = tab.split('-')
    }

    this.logger.log('info', 'comms', `%c[CommsServer::sendToFrame] attempting to send message to tab ${tab}, frame ${frame}`, "background: #dda; color: #11D", message);

    try {
      this.ports[tab][frame].postMessage(message);
    } catch (e) {
      this.logger.log('error', 'comms', `%c[CommsServer::sendToFrame] Sending message failed. Reason:`, "background: #dda; color: #11D", e);
    }
  }

  async sendToActive(message) {
    this.logger.log('info', 'comms', "%c[CommsServer::sendToActive] trying to send a message to active tab. Message:", "background: #dda; color: #11D", message);

    var tabs = await this._getActiveTab();

    this.logger.log('info', 'comms', "[CommsServer::_sendToActive] currently active tab(s)?", tabs);
    for (var key in this.ports[tabs[0].id]) {
      this.logger.log('info', 'comms', "key?", key, this.ports[tabs[0].id]);
    }

    for (var key in this.ports[tabs[0].id]) {
      this.ports[tabs[0].id][key].postMessage(message);
    }
  }

  onConnect(port){
    var ths = this;
    
    // poseben primer | special case
    if (port.name === 'popup-port') {
      this.popupPort = port;
      this.popupPort.onMessage.addListener( (m,p) => ths.processReceivedMessage(m,p));
      return;
    }

    var tabId = port.sender.tab.id;
    var frameId = port.sender.frameId;
    if(! this.ports[tabId]){
      this.ports[tabId] = {}; 
    }
    this.ports[tabId][frameId] = port;
    this.ports[tabId][frameId].onMessage.addListener( (m,p) => ths.processReceivedMessage(m, p));
    this.ports[tabId][frameId].onDisconnect.addListener( (p) => { 
      delete ths.ports[p.sender.tab.id][p.sender.frameId]; 
      if(Object.keys(ths.ports[p.sender.tab.id]).length === 0){
        ths.ports[tabId] = undefined;
      }
    });
  }


  async execCmd(message, portOrSender, sendResponse) {
    this.logger.log(
      'info', 'comms', '[CommsServer.js::execCmd] Received message', message,
      ". Port/sender:", portOrSender, "sendResponse:", sendResponse, "\nThere is ", this.commands[message.cmd]?.length ?? 0,
      " command(s) for action", message.cmd
    );
    if (this.commands[message.cmd]) {
      for (const c of this.commands[message.cmd]) {
        await c(message, portOrSender, sendResponse);
      }
    }
  }

  async handleMessage(message, portOrSender, sendResponse) {
    await this.execCmd(message, portOrSender, sendResponse);
    
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

  processReceivedMessage_nonpersistent(message, sender, sendResponse){
    this.logger.log('info', 'comms', "%c[CommsServer.js::processMessage_nonpersistent] Received message from background script!", "background-color: #11D; color: #aad", message, sender);
    
    this.handleMessage(message, sender, sendResponse);
  }
}

export default CommsServer;
