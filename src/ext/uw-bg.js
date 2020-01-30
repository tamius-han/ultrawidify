import Debug from './conf/Debug.js';
import BrowserDetect from './conf/BrowserDetect';
import CommsServer from './lib/comms/CommsServer';
import Settings from './lib/Settings';
import Logger from './lib/Logger';

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
    this._gctimeout = undefined;

    this.selectedSubitem = {
      'siteSettings': undefined,
      'videoSettings': undefined,
    }
  }

  async setup() {
    // logger is the first thing that goes up
    const loggingOptions = {
      isBackgroundScript: true,
      allowLogging: true,
      useConfFromStorage: true,
      logAll: true,
      fileOptions: {
        enabled: true,
      },
      consoleOptions: {
        enabled: true
      }
    };
    this.logger = new Logger();
    await this.logger.init(loggingOptions);

    this.settings = new Settings({logger: this.logger});
    await this.settings.init();
    this.comms = new CommsServer(this);

    var ths = this;
    if(BrowserDetect.firefox) {
      browser.tabs.onActivated.addListener(function(m) {ths.onTabSwitched(m)});  
    } else if (BrowserDetect.chrome) {
      chrome.tabs.onActivated.addListener(function(m) {ths.onTabSwitched(m)});
    }

    this.scheduleGc();
  }

  async _promisifyTabsGet(browserObj, tabId){
    return new Promise( (resolve, reject) => {
      browserObj.tabs.get(tabId, (tab) => resolve(tab));
    });
  }

  async injectCss(css, sender) {
    try {
      if (BrowserDetect.firefox || BrowserDetect.edge) {
        browser.tabs.insertCSS(sender.tab.id, {code: css, cssOrigin: 'user', frameId: sender.frameId});
      } else if (BrowserDetect.chrome) {
        chrome.tabs.insertCSS(sender.tab.id, {code: css, cssOrigin: 'user', frameId: sender.frameId});
      }
    } catch (e) {
      this.logger.log('error','debug', '[UwServer::injectCss] Error while injecting css:', {error: e, css, sender});
    }
  }
  async removeCss(css, sender) {
    try {
      if (BrowserDetect.firefox || BrowserDetect.edge) {
        browser.tabs.removeCSS(sender.tab.id, {code: css, cssOrigin: 'user', frameId: sender.frameId});
      } else if (BrowserDetect.chrome) {
        // this doesn't work currently, but hopefully chrome will get this feature in the future
        chrome.tabs.removeCSS(sender.tab.id, {code: css, cssOrigin: 'user', frameId: sender.frameId});
      }
    } catch (e) { 
      this.logger.log('error','debug', '[UwServer::injectCss] Error while removing css:', {error: e, css, sender});
    }
  }

  async replaceCss(oldCss, newCss, sender) {
    if (oldCss !== newCss) {
      this.injectCss(newCss, sender);
      this.removeCss(oldCss, sender);
    }
  }

  scheduleGc(timeout) {
    if (this._gctimeout) {
      return;
    }
    if (!timeout) {
      timeout = 0;
    }

    const ths = this;
    setTimeout( () => {
      clearTimeout(ths._gctimeout);
      ths.gcFrames();

      ths._gctimeoutgcTimeout = ths.scheduleGc(5000);
    }, timeout);
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

    try {
      this.currentTabId = activeInfo.tabId;   // just for readability

      let tab;
      if (BrowserDetect.firefox) {
        tab = await browser.tabs.get(this.currentTabId);
      } else if (BrowserDetect.chrome) {
        tab = await this._promisifyTabsGet(chrome, this.currentTabId);
      }

      this.currentSite = this.extractHostname(tab.url);
      this.logger.log('info', 'debug', '[UwServer::onTabSwitched] user switched tab. New site:', this.currentSite);
    } catch(e) {
      this.logger.log('error', 'debug', '[UwServer::onTabSwitched] there was a problem getting currnet site:', e)
    }

    this.selectedSubitem = {
      'siteSettings': undefined,
      'videoSettings': undefined,
    }
    //TODO: change extension icon based on whether there's any videos on current page
  }

  async gcFrames() {
    // does "garbage collection" on frames

    let frames;
    
    if (BrowserDetect.firefox) {
      frames = await browser.webNavigation.getAllFrames({tabId: this.currentTabId});
    } else if (BrowserDetect.chrome) {
      frames = await new Promise( (resolve, reject) => {
        chrome.webNavigation.getAllFrames({tabId: this.currentTabId}, (data) => {resolve(data); return true});
      });
    }

    if (this.videoTabs[this.currentTabId]) {
      for (let key in this.videoTabs[this.currentTabId].frames) {
        if (! frames.find(x => x.frameId == key)) {
          delete this.videoTabs[this.currentTabId].frames[key];
        }
      }
    }
  }

  registerVideo(sender) {
    this.logger.log('info', 'comms', '[UWServer::registerVideo] Registering video.\nsender:', sender);

    const tabHostname = this.extractHostname(sender.tab.url);
    const frameHostname = this.extractHostname(sender.url);

    // preveri za osirotele/zastarele vrednosti ter jih po potrebi izbriši
    // check for orphaned/outdated values and remove them if neccessary
    if (this.videoTabs[sender.tab.id]?.host != tabHostname) {
      delete this.videoTabs[sender.tab.id]
    } else if(this.videoTabs[sender.tab.id]?.frames[sender.frameId]?.host != frameHostname) {
      delete this.videoTabs[sender.tab.id].frames[sender.frameId];
    }

    if (this.videoTabs[sender.tab.id]) {
      if (this.videoTabs[sender.tab.id].frames[sender.frameId]) {
        return; // existing value is fine, no need to act
      } else {
        this.videoTabs[sender.tab.id].frames[sender.frameId] = {
          id: sender.frameId,
          host: frameHostname,
          url: sender.url
        }
      }
    } else {
      this.videoTabs[sender.tab.id] = {
        id: sender.tab.id,
        host: tabHostname,
        url: sender.tab.url,
        frames: {}
      };
      this.videoTabs[sender.tab.id].frames[sender.frameId] = {
        id: sender.frameId,
        host: frameHostname,
        url: sender.url
      }
    }

    this.logger.log('info', 'comms', '[UWServer::registerVideo] Video registered. current videoTabs:', this.videoTabs);
  }

  unregisterVideo(sender) {
    this.logger.log('info', 'comms', '[UwServer::unregisterVideo] Unregistering video.\nsender:', sender);
    if (this.videoTabs[sender.tab.id]) {
      if ( Object.keys(this.videoTabs[sender.tab.id].frames).length <= 1) {
        delete this.videoTabs[sender.tab.id]
      } else {
        if(this.videoTabs[sender.tab.id].frames[sender.frameId]) {
          delete this.videoTabs[sender.tab.id].frames[sender.frameId];
        }
      }
    }
    this.logger.log('info', 'comms', '[UwServer::unregisterVideo] Video has been unregistered. Current videoTabs:', this.videoTabs);
  }

  setSelectedTab(menu, subitem) {
    this.logger.log('info', 'comms', '[UwServer::setSelectedTab] saving selected tab for', menu, ':', subitem);
    this.selectedSubitem[menu] = subitem;
  }

  async getCurrentTab() {
    if (BrowserDetect.firefox) {
      return (await browser.tabs.query({active: true, currentWindow: true}))[0];
    } else if (BrowserDetect.chrome) {
      return new Promise((resolve, reject) => chrome.tabs.query({active: true, currentWindow: true}, (x) => resolve(x[0])));
    }
  }

  async getVideoTab() {
    // friendly reminder: if current tab doesn't have a video, 
    // there won't be anything in this.videoTabs[this.currentTabId]

    const ctab = await this.getCurrentTab();

    console.log('Current tab:', ctab);

    if (!ctab || !ctab.id) {
      return {
        host: 'INVALID SITE',
        frames: [],
      }
    }

    if (this.videoTabs[ctab.id]) {
      return {
        ...this.videoTabs[ctab.id],
        host: this.extractHostname(ctab.url),
        selected: this.selectedSubitem 
      };
    }

    // return something more or less empty if this tab doesn't have 
    // a video registered for it
    return {
      host: this.extractHostname(ctab.url),
      frames: [],
      selected: this.selectedSubitem
    }
  }
}

var server = new UWServer();