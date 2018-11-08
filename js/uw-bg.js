var BgVars = {
  arIsActive: true,
  hasVideos: false,
  currentSite: ""
}

class UWServer {

  constructor() {
    this.ports = [];
    this.arIsActive = true;
    this.hasVideos = false;
    this.currentSite = "";
    this.setup();

    this.videoTabs = {};
    this.currentTabId = 0;
  }

  async setup() {
    this.settings = new Settings();

    await this.settings.init();
    this.comms = new CommsServer(this);

    var ths = this;
    if(BrowserDetect.firefox) {
      browser.tabs.onActivated.addListener(function(m) {ths.onTabSwitched(m)});  
    } else if (BrowserDetect.chrome) {
      chrome.tabs.onActivated.addListener(function(m) {ths.onTabSwitched(m)});
    }
  }

  async _promisifyTabsGet(browserObj, tabId){
    return new Promise( (resolve, reject) => {
      browserObj.tabs.get(tabId, (tab) => resolve(tab));
    });
  }

  extractHostname(url){
    var hostname;
    
    // extract hostname  
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

  async onTabSwitched(activeInfo){
    this.hasVideos = false;

    if(Debug.debug)
      console.log("[uw-bg::onTabSwitched] TAB CHANGED, GETTING INFO FROM MAIN TAB");

    try {
      this.currentTabId = activeInfo.tabId;   // just for readability

      var tab;
      if (BrowserDetect.firefox) {
        var tab = await browser.tabs.get(this.currentTabId);
      } else if (BrowserDetect.chrome) {
        var tab = await this._promisifyTabsGet(chrome, this.currentTabId);
      }

      this.currentSite = this.extractHostname(tab.url);
    } catch(e) {
      console.log(e);
    }

    if(Debug.debug) {
      console.log("TAB SWITCHED!", this.currentSite)
    }
    //TODO: change extension icon based on whether there's any videos on current page
  }

  registerVideo(sender) {
    if (Debug.debug && Debug.comms) {
      console.log("[UWServer::registerVideo] registering video.\nsender:", sender);
    }

    const tabHostname = this.extractHostname(sender.tab.url);
    const frameHostname = this.extractHostname(sender.url);

    // preveri za osirotele/zastarele vrednosti ter jih po potrebi izbriši
    // check for orphaned/outdated values and remove them if neccessary
    if (this.videoTabs[sender.tab.id]) {
      if (this.videoTabs[sender.tab.id].host != tabHostname) {
        delete this.videoTabs[sender.tab.id]
      } else {
        if(this.videoTabs[sender.tab.id].frames[sender.frameId]) {
          if (this.videoTabs[sender.tab.id].frames[sender.frameId].host != frameHostname) {
            delete this.videoTabs[sender.tab.id].frames[sender.frameId];
          }
        }
      }
    }

    if (this.videoTabs[sender.tab.id]) {
      if (this.videoTabs[sender.tab.id].frames[sender.frameId]) {
        return; // existing value is fine, no need to act
      } else {
        this.videoTabs[sender.tab.id].frames[sender.frameId] = {
          host: frameHostname,
          url: sender.url
        }
      }
    } else {
      this.videoTabs[sender.tab.id] = {
        host: tabHostname,
        url: sender.tab.url,
        frames: {}
      };
      this.videoTabs[sender.tab.id].frames[sender.frameId] = {
        host: frameHostname,
        url: sender.url
      }
    }

    if (Debug.debug && Debug.comms) {
      console.log("[UWServer::registerVideo] video registered. current videoTabs:", this.videoTabs);
    }
  }

  unregisterVideo(sender) {
    if (Debug.debug && Debug.comms) {
      console.log("[UWServer::unregisterVideo] unregistering video.\nsender:", sender);
    }
    if (this.videoTabs[sender.tab.id]) {
      if ( Object.keys(this.videoTabs[sender.tab.id].frames).length <= 1) {
        delete this.videoTabs[sender.tab.id]
      } else {
        if(this.videoTabs[sender.tab.id].frames[sender.frameId]) {
          delete this.videoTabs[sender.tab.id].frames[sender.frameId];
        }
      }
    }
    if (Debug.debug && Debug.comms) {
      console.log("[UWServer::ungisterVideo] video unregistered. current videoTabs:", this.videoTabs);
    }
  }

  getVideoTab() {
    // friendly reminder: if current tab doesn't have a video, 
    // there won't be anything in this.videoTabs[this.currentTabId]
    if (this.videoTabs[this.currentTabId]) {
      return this.videoTabs[this.currentTabId];
    }

    // return something more or less empty if this tab doesn't have 
    // a video registered for it
    return {
      host: this.currentSite,
      frames: []
    }
  }
}

var server = new UWServer();