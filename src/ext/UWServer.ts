import Debug from './conf/Debug.js';
import BrowserDetect from './conf/BrowserDetect';
import CommsServer from './lib/comms/CommsServer';
import Settings from './lib/Settings';
import Logger, { baseLoggingOptions } from './lib/Logger';

import { sleep } from '../common/js/utils';

import { browser } from 'webextension-polyfill-ts';
import EventBus, { EventBusCommand } from './lib/EventBus';

export default class UWServer {
  settings: Settings;
  logger: Logger;
  comms: CommsServer;
  eventBus: EventBus;

  ports: any[] = [];
  hasVideos: boolean;
  currentSite: string = '';
  videoTabs: any = {};
  currentTabId: number = 0;

  selectedSubitem: any = {
    'siteSettings': undefined,
    'videoSettings': undefined,
  }

  eventBusCommands = {
    'popup-set-selected-tab': [{
      function: (message) => this.setSelectedTab(message.selectedMenu, message.selectedSubitem)
    }],
    'has-video': [{
      function: (message, context) => this.registerVideo(context.comms.sender)
    }],
    'noVideo' : [{
      function: (message, context) => this.unregisterVideo(context.comms.sender)
    }],
    'inject-css': [{
      function: (message, context) => this.injectCss(message.cssString, context.comms.sender)
    }],
    'eject-css': [{
      function: (message, context) => this.removeCss(message.cssString, context.comms.sender)
    }],
    'replace-css': [{
      function: (message, context) => this.replaceCss(message.oldCssString, message.newCssString, context.comms.sender)
    }],
    'get-current-site': [{
      function: (message, context) => this.getCurrentSite()
    }]
  };

  private gcTimeout: any;
  uiLoggerInitialized: boolean = false;


  //#region getters
  get activeTab() {
    return browser.tabs.query({currentWindow: true, active: true});
  }
  //#endregion

  constructor() {
    this.setup();
  }

  async setup() {
    try {
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

      this.eventBus = new EventBus();

      for (const action in this.eventBusCommands) {
        for (const command of this.eventBusCommands[action]) {
          this.eventBus.subscribe(action, command);
        }
      }

      this.comms = new CommsServer(this);
      this.eventBus.setComms(this.comms);

      browser.tabs.onActivated.addListener((m) => {this.onTabSwitched(m)});
    } catch (e) {
      console.error(`Ultrawidify [server]: failed to start. Reason:`, e);
    }
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

  async getCurrentSite() {
    this.eventBus.send(
      'set-current-site',
      {
        site: await this.getVideoTab(),
        tabHostname: await this.getCurrentTabHostname(),
      },
      {
        comms: {
          forwardTo: 'popup'
        }
      }
    )
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

  async getCurrentTabHostname() {
    const activeTab = await this.activeTab;

    if (!activeTab || activeTab.length < 1) {
      this.logger.log('warn', 'comms', 'There is no active tab for some reason. activeTab:', activeTab);
      return null;
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
}
