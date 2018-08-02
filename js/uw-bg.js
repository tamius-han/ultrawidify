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
  }

  async setup() {
    await Settings.init();
    this.comms = new CommsServer(this);


    var ths = this;
    if(BrowserDetect.firefox) {
      browser.tabs.onActivated.addListener((m) => ths.onTabSwitched(m));  
    } else if (BrowserDetect.chrome) {
      chrome.tabs.onActivated.addListener((m) => ths.onTabSwitched(m));
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
    var tabId = activeInfo.tabId;   // just for readability

    var tab;
    if (BrowserDetect.firefox) {
      var tab = await browser.tabs.get(tabId);
    } else if (BrowserDetect.chrome) {
      var tab = await this._promisifyTabsGet(chrome, tabId);
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

}

var server = new UWServer();