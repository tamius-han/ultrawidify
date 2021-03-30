import Debug from './conf/Debug.js';
import BrowserDetect from './conf/BrowserDetect';
import CommsServer from './lib/comms/CommsServer';
import Settings from './lib/Settings';
import Logger, { baseLoggingOptions } from './lib/Logger';

import { sleep } from '../common/js/utils';

import { browser } from 'webextension-polyfill-ts';

export default class UWServer {
  settings: Settings;
  logger: Logger;
  comms: CommsServer;

  ports: any[] = [];
  hasVideos: boolean;
  currentSite: string = '';
  videoTabs: any = {};
  currentTabId: number = 0;

  selectedSubitem: any = {
    'siteSettings': undefined,
    'videoSettings': undefined,
  }


  private gcTimeout: any;
  uiLoggerInitialized: boolean = false;

  constructor() {
    this.setup();
  }

  async setup() {
    // logger is the first thing that goes up

    const loggingOptions = {
      isBackgroundScript: true,
      allowLogging: false,
      useConfFromStorage: true,
      logAll: true,
      fileOptions: {
        enabled: false,
      },
      consoleOptions: {
        enabled: false
      }
    };
    this.logger = new Logger();
    await this.logger.init(loggingOptions);

    this.settings = new Settings({logger: this.logger});
    await this.settings.init();
    this.comms = new CommsServer(this);
    this.comms.subscribe('show-logger', async () => await this.initUiAndShowLogger());
    this.comms.subscribe('init-vue', async () => await this.initUi());
    this.comms.subscribe('uwui-vue-initialized', () => this.uiLoggerInitialized = true);
    this.comms.subscribe('emit-logs', () => {});  // we don't need to do anything, this gets forwarded to UI content script as is

    browser.tabs.onActivated.addListener((m) => {this.onTabSwitched(m)});  
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
      } else if (BrowserDetect.anyChromium) {
        chrome.tabs.insertCSS(sender.tab.id, {code: css, cssOrigin: 'user', frameId: sender.frameId});
      }
    } catch (e) {
      this.logger.log('error','debug', '[UwServer::injectCss] Error while injecting css:', {error: e, css, sender});
    }
  }
  async removeCss(css, sender) {
    try {
      browser.tabs.removeCSS(sender.tab.id, {code: css, cssOrigin: 'user', frameId: sender.frameId});
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

  extractHostname(url){
    var hostname;
    
    if (!url) {
      return "<no url>";
    }

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
      } else if (BrowserDetect.anyChromium) {
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
      this.videoTabs[sender.tab.id].frames[sender.frameId] = {
        id: sender.frameId,
        host: frameHostname,
        url: sender.url,
        registerTime: Date.now(),
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
        url: sender.url,
        registerTime: Date.now(),
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

  async initUi() {
    try {
      if (BrowserDetect.firefox) {
        await browser.tabs.executeScript({
          file: '/ext/uw-ui.js',
          allFrames: true,
        });
      } else if (BrowserDetect.anyChromium) {
        await new Promise<void>( resolve => 
          chrome.tabs.executeScript({
            file: '/ext/uw-ui.js',
            allFrames: true,
          }, () => resolve())
        );
      }
      
    } catch (e) {
      this.logger.log('ERROR', 'uwbg', 'UI initialization failed. Reason:', e);
    }
  }

  async initUiAndShowLogger() {
    // this implementation is less than optimal and very hacky, but it should work
    // just fine for our use case.
    this.uiLoggerInitialized = false;

    await this.initUi();

    await new Promise<void>( async (resolve, reject) => {
      // if content script doesn't give us a response within 5 seconds, something is 
      // obviously wrong and we stop waiting,

      // oh and btw, resolve/reject do not break the loops, so we need to do that 
      // ourselves:
      // https://stackoverflow.com/questions/55207256/will-resolve-in-promise-loop-break-loop-iteration
      let isRejected = false;
      setTimeout( async () => {isRejected = true; reject()}, 5000);

      // check whether UI has been initiated on the FE. If it was, we resolve the 
      // promise and off we go
      while (!isRejected) {
        if (this.uiLoggerInitialized) {
          resolve();
          return;        // remember the bit about resolve() not breaking the loop?
        }
        await sleep(100);
      }
    })
  }

  async getCurrentTab() {
    return (await browser.tabs.query({active: true, currentWindow: true}))[0];
  }

  async getVideoTab() {
    // friendly reminder: if current tab doesn't have a video, 
    // there won't be anything in this.videoTabs[this.currentTabId]

    const ctab = await this.getCurrentTab();

    if (!ctab || !ctab.id) {
      return {
        host: 'INVALID SITE',
        frames: [],
      }
    }

    if (this.videoTabs[ctab.id]) {
      // if video is older than PageInfo's video rescan period (+ 4000ms of grace),
      // we clean it up from videoTabs[tabId].frames array.
      const ageLimit = Date.now() - this.settings.active.pageInfo.timeouts.rescan - 4000;
      try {
        for (const key in this.videoTabs[ctab.id].frames) {
          if (this.videoTabs[ctab.id].frames[key].registerTime < ageLimit) {
            delete this.videoTabs[ctab.id].frames[key];
          }
        }
      } catch (e) {
        // something went wrong. There's prolly no frames.
        return {
          host: this.extractHostname(ctab.url),
          frames: [],
          selected: this.selectedSubitem
        }
      }

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

  // chrome shitiness mitigation 
  sendUnmarkPlayer(message) {
    this.comms.sendUnmarkPlayer(message);
  }
}
