if(Debug.debug){
  console.log("Loading Comms.js");
}

class CommsClient {
  constructor(name, settings) {
    if (BrowserDetect.firefox) {
      this.port = browser.runtime.connect({name: name});
    } else if (BrowserDetect.chrome) {
      this.port = chrome.runtime.connect({name: name});
    } else if (BrowserDetect.edge) {
      this.port = browser.runtime.connect({name: name})
    }

    var ths = this;
    this._listener = m => ths.processReceivedMessage(m);
    this.port.onMessage.addListener(this._listener);

    this.settings = settings;
    this.pageInfo = undefined;
    this.commsId = (Math.random() * 20).toFixed(0);
  }
  
  destroy() {
    this.pageInfo = null;
    this.settings = null;
    this.port.onMessage.removeListener(this._listener);
  }

  setPageInfo(pageInfo){

    this.pageInfo = pageInfo;

    if(Debug.debug) {
      console.log(`[CommsClient::setPageInfo] <${this.commsId}>`, "SETTING PAGEINFO —", this.pageInfo, this)
    }

    var ths = this;
    this._listener = m => ths.processReceivedMessage(m);
    this.port.onMessage.removeListener(this._listener);
    this.port.onMessage.addListener(this._listener);
    
  }

  processReceivedMessage(message){
    if(Debug.debug && Debug.comms){
      console.log(`[CommsClient.js::processMessage] <${this.commsId}> Received message from background script!`, message);
    }

    if (!this.pageInfo || !this.settings.active) {
      if(Debug.debug && Debug.comms){
        console.log(`[CommsClient.js::processMessage] <${this.commsId}> this.pageInfo (or settings) not defined. Extension is probably disabled for this site.\npageInfo:`, this.pageInfo,
                    "\nsettings.active:", this.settings.active,
                    "\nnobj:", this
        );
      }
      return;
    }

    if (message.cmd === "set-ar") {
      this.pageInfo.setAr(message.ratio);
    } else if (message.cmd === 'set-video-float') {
      this.pageInfo.setVideoFloat(message.newFloat);
      this.pageInfo.restoreAr();
    } else if (message.cmd === "set-stretch") {
      this.pageInfo.setStretchMode(StretchMode[message.mode]);
    } else if (message.cmd === "autoar-start") {
      if (message.enabled !== false) {
        this.pageInfo.initArDetection();
        this.pageInfo.startArDetection();
      } else {
        this.pageInfo.stopArDetection();
      }
    } else if (message.cmd === "pause-processing") {
      this.pageInfo.pauseProcessing();
    } else if (message.cmd === "resume-processing") {
      // todo: autoArStatus
      this.pageInfo.resumeProcessing(message.autoArStatus);
    } else if (message.cmd === 'set-zoom') {
      this.pageInfo.setZoom(message.zoom);
    }
  }

  async sleep(n){
    return new Promise( (resolve, reject) => setTimeout(resolve, n) );
  }

  async sendMessage_nonpersistent(message){
    if(BrowserDetect.firefox){
      return browser.runtime.sendMessage(message)
    } else {
      return new Promise((resolve, reject) => {
        try{
          if(BrowserDetect.edge){
            browser.runtime.sendMessage(message, function(response){
              var r = response; 
              resolve(r);
            });
          } else {
            chrome.runtime.sendMessage(message, function(response){
              // Chrome/js shittiness mitigation — remove this line and an empty array will be returned
              var r = response; 
              resolve(r);
            });
          }
        }
        catch(e){
          reject(e);
        }
      });
    }
  }

  async requestSettings(){
    if(Debug.debug){
      console.log("%c[CommsClient::requestSettings] sending request for congif!", "background: #11D; color: #aad");
    }
    var response = await this.sendMessage_nonpersistent({cmd: 'get-config'});
    if(Debug.debug){
      console.log("%c[CommsClient::requestSettings] received settings response!", "background: #11D; color: #aad", response);
    }

    if(! response || response.extensionConf){
      return Promise.resolve(false);
    }

    this.settings.active = JSON.parse(response.extensionConf);
    return Promise.resolve(true);
  }

  registerTab() {
    this.port.postMessage({cmd: "register-tab", url: location.hostname});
  } 

  registerVideo(){
    this.port.postMessage({cmd: "has-video"});
  }

  unregisterVideo(){
    this.port.postMessage({cmd: "noVideo"});  // ayymd
  }
}

class CommsServer {
  constructor(server) {
    this.server = server;
    this.settings = server.settings;
    this.ports = [];

    var ths = this;


    if (BrowserDetect.firefox) {
      browser.runtime.onConnect.addListener(p => ths.onConnect(p));
      browser.runtime.onMessage.addListener(m => ths.processReceivedMessage_nonpersistent_ff(m));
    } else {
      chrome.runtime.onConnect.addListener(p => ths.onConnect(p));
      chrome.runtime.onMessage.addListener((msg, sender, callback) => ths.processReceivedMessage_nonpersistent_chrome(m, sender, callback));
    }
  }

  async getCurrentTabHostname() {
    const activeTab = await this._getActiveTab();

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
        chrome.tabs.query({currentWindow: true, active: true}, function (res) {
          resolve(res);
        });
      });
    }
  }

  async sendToActive(message) {
    if(Debug.debug && Debug.comms){
      console.log("%c[CommsServer::sendToActive] trying to send a message to active tab. Message:", "background: #dda; color: #11D", message);
    }

    var tabs = await this._getActiveTab();

    if(Debug.debug && Debug.comms){
      console.log("[CommsServer::_sendToActive_ff] currently active tab(s)?", tabs);
      for (var key in this.ports[tabs[0].id]) {
        console.log("key?", key, this.ports[tabs[0].id]);
        // this.ports[tabs[0].id][key].postMessage(message);
      }
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

  async processReceivedMessage(message, port){
    if (Debug.debug && Debug.comms) {
      console.log("[CommsServer.js::processMessage] Received message from background script!", message, "port", port, "\nsettings and server:", this.settings,this.server);
    }

    if(message.cmd === 'get-current-site') {
      port.postMessage({cmd: 'set-current-site', site: this.server.currentSite});
    }

    if(message.cmd === 'register-tab') {
      if(Debug.debug) { // we want to get these messages always when debugging
        console.log("[Comms::processReceivedMessage] registering tab with hostname", message.url)
      }

      const currentUrl = await this.getCurrentTabHostname();
      if (message.url === currentUrl) {
        this.server.currentSite = message.url;

        if(Debug.debug) { // we want to get these messages always when debugging
          console.log("[Comms::processReceivedMessage] hostname matches currently active tab. active:", currentUrl, "message:", message.url);
        }
      } else {
        if(Debug.debug) { // we want to get these messages always when debugging
          console.log("[Comms::processReceivedMessage] hostnames don't match. active:", currentUrl, "message:", message.url);
        }
      }
    }

    if (message.cmd === 'get-config') {
      if(Debug.debug) {
        console.log("CommsServer: received get-config. Active settings?", this.settings.active, "\n(settings:", this.settings, ")")
      }
      port.postMessage({cmd: "set-config", conf: this.settings.active, site: this.server.currentSite})
    } else if (message.cmd === 'set-stretch') {
      this.sendToActive(message);
    } else if (message.cmd === 'set-ar') {
      this.sendToActive(message);
    } else if (message.cmd === 'set-custom-ar') {
      this.settings.active.keyboard.shortcuts.q.arg = message.ratio;
      this.settings.save();
    } else if (message.cmd === 'set-video-float') {
      this.sendToActive(message);
    } else if (message.cmd === 'autoar-start') {
      this.sendToActive(message);
    } else if (message.cmd === "autoar-disable") {  // LEGACY - can be removed prolly
      this.settings.active.arDetect.mode = "disabled";
      if(message.reason){
        this.settings.active.arDetect.disabledReason = message.reason;
      } else {
        this.settings.active.arDetect.disabledReason = 'User disabled';
      }
      this.settings.save();
    } else if (message.cmd === 'set-zoom') {
      this.sendToActive(message);
    }
  }

  processReceivedMessage_nonpersistent_ff(message, sender){
    if (Debug.debug && Debug.comms) {
      console.log("%c[CommsServer.js::processMessage_nonpersistent_ff] Received message from background script!", "background-color: #11D; color: #aad", message, sender);
    }

    if (message.cmd === 'get-config') {
      var ret = {extensionConf: JSON.stringify(this.settings.active)};
      if (Debug.debug && Debug.comms) {
        console.log("%c[CommsServer.js::processMessage_nonpersistent_ff] Returning this:", "background-color: #11D; color: #aad", ret);
      }
      Promise.resolve(ret);
    } else if (message.cmd === "autoar-enable") {
      this.settings.active.arDetect.mode = "blacklist";
      this.settings.save();
      this.sendToAll({cmd: "reload-settings", sender: "uwbg"})
      if(Debug.debug){
        console.log("[uw-bg] autoar set to enabled (blacklist). evidenz:", this.settings.active);
      }
    } else if (message.cmd === "autoar-disable") {
      this.settings.active.arDetect.mode = "disabled";
      if(message.reason){
        this.settings.active.arDetect.disabledReason = message.reason;
      } else {
        this.settings.active.arDetect.disabledReason = 'User disabled';
      }
      this.settings.save();
      this.sendToAll({cmd: 'reload-settings', newConf: this.settings.active});
      if(Debug.debug){
        console.log("[uw-bg] autoar set to disabled. evidenz:", this.settings.active);
      }
    } else if (message.cmd === "autoar-set-interval") {
      if(Debug.debug)
        console.log("[uw-bg] trying to set new interval for autoAr. New interval is",message.timeout,"ms");

      // set fairly liberal limit
      var timeout = message.timeout < 4 ? 4 : message.timeout;
      this.settings.active.arDetect.timer_playing = timeout;
      this.settings.save();
      this.sendToAll({cmd: 'reload-settings', newConf: this.settings.active});
    }
  }

  processReceivedMessage_nonpersistent_chrome(message, sender, sendResponse){
    if (Debug.debug && Debug.comms) {
      console.log("[CommsServer.js::processMessage_nonpersistent_chrome] Received message from background script!", message);
    }

    if(message.cmd === 'get-config') {
      sendResponse({extensionConf: JSON.stringify(this.settings.active), site: getCurrentTabUrl()});
      // return true;
    } else if (message.cmd === "autoar-enable") {
      this.settings.active.arDetect.mode = "blacklist";
      this.settings.save();
      this.sendToAll({cmd: "reload-settings", sender: "uwbg"})
      if(Debug.debug){
        console.log("[uw-bg] autoar set to enabled (blacklist). evidenz:", this.settings.active);
      }
    } else if (message.cmd === "autoar-disable") {
      this.settings.active.arDetect.mode = "disabled";
      if(message.reason){
        this.settings.active.arDetect.disabledReason = message.reason;
      } else {
        this.settings.active.arDetect.disabledReason = 'User disabled';
      }
      this.settings.save();
      this.sendToAll({cmd: 'reload-settings', newConf: this.settings.active});
      if(Debug.debug){
        console.log("[uw-bg] autoar set to disabled. evidenz:", this.settings.active);
      }
    } else if (message.cmd === "autoar-set-interval") {
      if(Debug.debug)
        console.log("[uw-bg] trying to set new interval for autoAr. New interval is",message.timeout,"ms");

      // set fairly liberal limit
      var timeout = message.timeout < 4 ? 4 : message.timeout;
      this.settings.active.arDetect.timer_playing = timeout;
      this.settings.save();
      this.sendToAll({cmd: 'reload-settings', newConf: this.settings.active});
    }
  }
}

class Comms {
  static async sendMessage(message){
    if(BrowserDetect.firefox){
      return browser.runtime.sendMessage(message)
    } else {
      return new Promise((resolve, reject) => {
        try{
          if(BrowserDetect.edge){
            browser.runtime.sendMessage(message, function(response){
              var r = response; 
              resolve(r);
            });
          } else {
            chrome.runtime.sendMessage(message, function(response){
              // Chrome/js shittiness mitigation — remove this line and an empty array will be returned
              var r = response; 
              resolve(r);
            });
          }
        }
        catch(e){
          reject(e);
        }
      });
    }
  }

}
