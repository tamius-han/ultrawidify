if(Debug.debug){
  console.log("Loading Comms.js");
}

class CommsClient {
  constructor(name) {
    if (BrowserDetect.firefox) {
      this.port = browser.runtime.connect({name: name});
    } else if (BrowserDetect.chrome) {
      this.port = chrome.runtime.connect({name: name});
    }

    var ths = this;
    this.port.onMessage.addListener(m => ths.processReceivedMessage(m));
    this.hasSettings = false;
  }
  
  setPageInfo(pageInfo){
    this.pageInfo = pageInfo;
  }

  processReceivedMessage(message){
    if(Debug.debug && Debug.comms){
      console.log("[CommsClient.js::processMessage] Received message from background script!", message);
    }

    if (message.cmd === "set-ar") {
      this.pageInfo.setAr(message.ratio);
    } else if (message.cmd === 'set-video-float') {
      ExtensionConf.miscFullscreenSettings.videoFloat = message.newFloat;
      this.pageInfo.restoreAr();
    } else if (message.cmd === "has-videos") {
      
    } else if (message.cmd === "set-config") {
      this.hasSettings = true;
      ExtensionConf = message.conf;
      // this.pageInfo.reset();
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
    } else if (message.cmd === "reload-settings") {
      ExtensionConf = message.newConf;
      this.pageInfo.reset();
      if(ExtensionConf.arDetect.mode === "disabled") {
        this.pageInfo.stopArDetection();
      } else {
        this.pageInfo.startArDetection();
      }
    }
  }

  async waitForSettings(){
    var t = this;
    return new Promise( async (resolve, reject) => {
      while(true){
        await t.sleep(100);
        if(this.hasSettings){
          resolve();
          break;
        }
      }
    });
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

    ExtensionConf = JSON.parse(response.extensionConf);
    return Promise.resolve(true);
  }

  async requestSettings_fallback(){
    this.port.postMessage({cmd: "get-config"});
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

  async getCurrentTabUrl() {

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

  processReceivedMessage(message, port){
    if (Debug.debug && Debug.comms) {
      console.log("[CommsServer.js::processMessage] Received message from background script!", message, "port", port);
    }

    if (message.cmd === 'get-config') {
      port.postMessage({cmd: "set-config", conf: ExtensionConf, site: this.server.currentSite})
    } else if (message.cmd === 'set-stretch') {
      this.sendToActive(message);
    } else if (message.cmd === 'set-stretch-default') {
      ExtensionConf.stretch.initialMode = message.mode;
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: 'reload-settings', newConf: ExtensionConf});
    } else if (message.cmd === 'set-ar') {
      this.sendToActive(message);
    } else if (message.cmd === 'set-custom-ar') {
      ExtensionConf.keyboard.shortcuts.q.arg = message.ratio;
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: 'reload-settings', newConf: ExtensionConf});
    } else if (message.cmd === 'set-video-float') {
      this.sendToActive(message);
      ExtensionConf.miscFullscreenSettings.videoFloat = message.newFloat;
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: 'reload-settings', newConf: ExtensionConf});

    } else if (message.cmd === 'autoar-start') {
      this.sendToActive(message);
    } else if (message.cmd === "autoar-enable") {   // LEGACY - can be removed prolly?
      ExtensionConf.arDetect.mode = "blacklist";
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: 'reload-settings', newConf: ExtensionConf});
    } else if (message.cmd === "autoar-disable") {  // LEGACY - can be removed prolly?
      ExtensionConf.arDetect.mode = "disabled";
      if(message.reason){
        ExtensionConf.arDetect.disabledReason = message.reason;
      } else {
        ExtensionConf.arDetect.disabledReason = 'User disabled';
      }
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: 'reload-settings', newConf: ExtensionConf});
    } else if (message.cmd === "autoar-set-interval") {
      if(Debug.debug)
        console.log("[uw-bg] trying to set new interval for autoAr. New interval is",message.timeout,"ms");

      // set fairly liberal limit
      var timeout = message.timeout < 4 ? 4 : message.timeout;
      ExtensionConf.arDetect.timer_playing = timeout;
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: 'reload-settings', newConf: ExtensionConf});
    } else if (message.cmd === "set-autoar-defaults") {
      ExtensionConf.arDetect.mode = message.mode;
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: "reload-settings", sender: "uwbg"})
    } else if (message.cmd === "set-autoar-for-site") {
      if (ExtensionConf.sites[this.server.currentSite]) {
        ExtensionConf.sites[this.server.currentSite].arStatus = message.mode;
        Settings.save(ExtensionConf);
      } else {
        ExtensionConf.sites[this.server.currentSite] = {
          status: "default",
          arStatus: message.mode,
          statusEmbedded: "default"
        };
        Settings.save(ExtensionConf);
      }
      this.sendToAll({cmd: "reload-settings", sender: "uwbg"});
    } else if (message.cmd === "set-extension-defaults") {
      ExtensionConf.extensionMode = message.mode;
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: "reload-settings", sender: "uwbg"})
    } else if (message.cmd === "set-extension-for-site") {
      if (ExtensionConf.sites[this.server.currentSite]) {
        ExtensionConf.sites[this.server.currentSite].status = message.mode;
        Settings.save(ExtensionConf);
      } else {
        ExtensionConf.sites[this.server.currentSite] = {
          status: message.mode,
          arStatus: "default",
          statusEmbedded: message.mode
        };
        Settings.save(ExtensionConf);        
        console.log("SAVING PER-SITE OPTIONS,", this.server.currentSite, ExtensionConf.sites[this.server.currentSite])
      }
      this.sendToAll({cmd: "reload-settings", sender: "uwbg"});
    }

    if (message.cmd.startsWith('set-')) {
      port.postMessage({cmd: "set-config", conf: ExtensionConf, site: this.server.currentSite});
    }
  }

  processReceivedMessage_nonpersistent_ff(message, sender){
    if (Debug.debug && Debug.comms) {
      console.log("%c[CommsServer.js::processMessage_nonpersistent_ff] Received message from background script!", "background-color: #11D; color: #aad", message, sender);
    }

    if (message.cmd === 'get-config') {
      var ret = {extensionConf: JSON.stringify(ExtensionConf)};
      if (Debug.debug && Debug.comms) {
        console.log("%c[CommsServer.js::processMessage_nonpersistent_ff] Returning this:", "background-color: #11D; color: #aad", ret);
      }
      Promise.resolve(ret);
    } else if (message.cmd === "autoar-enable") {
      ExtensionConf.arDetect.mode = "blacklist";
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: "reload-settings", sender: "uwbg"})
      if(Debug.debug){
        console.log("[uw-bg] autoar set to enabled (blacklist). evidenz:", ExtensionConf);
      }
    } else if (message.cmd === "autoar-disable") {
      ExtensionConf.arDetect.mode = "disabled";
      if(message.reason){
        ExtensionConf.arDetect.disabledReason = message.reason;
      } else {
        ExtensionConf.arDetect.disabledReason = 'User disabled';
      }
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: 'reload-settings', newConf: ExtensionConf});
      if(Debug.debug){
        console.log("[uw-bg] autoar set to disabled. evidenz:", ExtensionConf);
      }
    } else if (message.cmd === "autoar-set-interval") {
      if(Debug.debug)
        console.log("[uw-bg] trying to set new interval for autoAr. New interval is",message.timeout,"ms");

      // set fairly liberal limit
      var timeout = message.timeout < 4 ? 4 : message.timeout;
      ExtensionConf.arDetect.timer_playing = timeout;
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: 'reload-settings', newConf: ExtensionConf});
    }
  }

  processReceivedMessage_nonpersistent_chrome(message, sender, sendResponse){
    if (Debug.debug && Debug.comms) {
      console.log("[CommsServer.js::processMessage_nonpersistent_chrome] Received message from background script!", message);
    }

    if(message.cmd === 'get-config') {
      sendResponse({extensionConf: JSON.stringify(ExtensionConf), site: getCurrentTabUrl()});
      // return true;
    } else if (message.cmd === "autoar-enable") {
      ExtensionConf.arDetect.mode = "blacklist";
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: "reload-settings", sender: "uwbg"})
      if(Debug.debug){
        console.log("[uw-bg] autoar set to enabled (blacklist). evidenz:", ExtensionConf);
      }
    } else if (message.cmd === "autoar-disable") {
      ExtensionConf.arDetect.mode = "disabled";
      if(message.reason){
        ExtensionConf.arDetect.disabledReason = message.reason;
      } else {
        ExtensionConf.arDetect.disabledReason = 'User disabled';
      }
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: 'reload-settings', newConf: ExtensionConf});
      if(Debug.debug){
        console.log("[uw-bg] autoar set to disabled. evidenz:", ExtensionConf);
      }
    } else if (message.cmd === "autoar-set-interval") {
      if(Debug.debug)
        console.log("[uw-bg] trying to set new interval for autoAr. New interval is",message.timeout,"ms");

      // set fairly liberal limit
      var timeout = message.timeout < 4 ? 4 : message.timeout;
      ExtensionConf.arDetect.timer_playing = timeout;
      Settings.save(ExtensionConf);
      this.sendToAll({cmd: 'reload-settings', newConf: ExtensionConf});
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
