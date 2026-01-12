import { Runtime } from 'chrome';
import EventBus from '@src/ext/module/EventBus';
import Settings from '@src/ext/module/settings/Settings';
import { ComponentLogger } from '@src/ext/module/logging/ComponentLogger';
import { BLANK_LOGGER_CONFIG, LogAggregator } from '@src/ext/module/logging/LogAggregator';
import CommsServer from '@src/ext/module/comms/CommsServer';
import BrowserDetect from '@src/ext/conf/BrowserDetect';
import { HostInfo } from '@src/common/interfaces/HostData.interface';
import { ExtensionEnvironment } from '@src/common/interfaces/SettingsInterface';


const BASE_LOGGING_STYLES = {
  'log': 'background-color: #243; color: #4a8',
}

export default class UWServer {
  settings: Settings;
  logger: ComponentLogger;
  logAggregator: LogAggregator;
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
    'popup-set-selected-tab': {
      function: (message) => this.setSelectedTab(message.selectedMenu, message.selectedSubitem)
    },
    'has-video': {
      function: (message, context) => this.registerVideo(context.comms.sender)
    },
    'noVideo' : {
      function: (message, context) => this.unregisterVideo(context.comms.sender)
    },
    'inject-css': {
      function: (message, context) => this.injectCss(message.cssString, context.comms.sender)
    },
    'eject-css': {
      function: (message, context) => this.removeCss(message.cssString, context.comms.sender)
    },
    'replace-css': {
      function: (message, context) => this.replaceCss(message.oldCssString, message.newCssString, context.comms.sender)
    },
    'get-current-site': {
      function: (message, context) => this.getCurrentSite(context.comms.sender)
    }
  };

  private gcTimeout: any;
  uiLoggerInitialized: boolean = false;


  //#region getters
  get activeTab() {
    return chrome.tabs.query({currentWindow: true, active: true});
  }
  //#endregion

  constructor() {
    this.setup();
  }

  async setup() {
    try {
      // logger is the first thing that goes up
      const loggingOptions = BLANK_LOGGER_CONFIG;

      this.logAggregator = new LogAggregator('🔶bg-script🔶');
      this.logger = new ComponentLogger(this.logAggregator, 'UwServer', {styles: BASE_LOGGING_STYLES});
      await this.logAggregator.init(loggingOptions);

      this.settings = new Settings({logAggregator: this.logAggregator});
      await this.settings.init();

      this.eventBus = new EventBus({isUWServer: true});

      this.eventBus.subscribeMulti(this.eventBusCommands, this);

      this.comms = new CommsServer(this);
      this.eventBus.setComms(this.comms);

      chrome.tabs.onActivated.addListener((m) => {this.onTabSwitched(m)});
    } catch (e) {
      console.error(`Ultrawidify [server]: failed to start. Reason:`, e);
    }
  }



  async _promisifyTabsGet(browserObj, tabId){
    return new Promise( (resolve, reject) => {
      browserObj.tabs.get(tabId, (tab) => resolve(tab));
    });
  }

  //#region CSS management

  async injectCss(css, sender) {
    this.logger.info('injectCss', 'Trying to inject CSS into tab', sender.tab.id, ', frameId:', sender.frameId, 'css:\n', css)
    if (!css) {
      return;
    }
    try {
      await chrome.scripting.insertCSS({
        target: {
          tabId: sender.tab.id,
          frameIds: [
            sender.frameId
          ]
        },
        css,
        origin: "USER"
      });
    } catch (e) {
      this.logger.error('injectCss', 'Error while injecting css:', {error: e, css, sender});
    }
  }
  async removeCss(css, sender) {
    try {
      await chrome.scripting.removeCSS({
        target: {
          tabId: sender.tab.id,
          frameIds: [
            sender.frameId
          ]
        },
        css,
        origin: "USER"
      });
    } catch (e) {
      this.logger.error('injectCss', 'Error while removing css:', {error: e, css, sender});
    }
  }
  async replaceCss(oldCss, newCss, sender) {
    if (oldCss !== newCss) {
      this.removeCss(oldCss, sender);
      this.injectCss(newCss, sender);
    }
  }
  //#endregion

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
        tab = await chrome.tabs.get(this.currentTabId);
      } else if (BrowserDetect.anyChromium) {
        tab = await this._promisifyTabsGet(chrome, this.currentTabId);
      }

      this.currentSite = this.extractHostname(tab.url);
      this.logger.info('onTabSwitched', 'user switched tab. New site:', this.currentSite);
    } catch(e) {
      this.logger.info('onTabSwitched', 'there was a problem getting current site:', e)
    }

    this.selectedSubitem = {
      'siteSettings': undefined,
      'videoSettings': undefined,
    }

    //TODO: change extension icon based on whether there's any videos on current page
  }

  registerVideo(sender) {
    this.logger.info('registerVideo', 'Registering video.\nsender:', sender);

    const tabHostname = this.extractHostname(sender.tab.url);
    const frameHostname = this.extractHostname(sender.url);

    // check for orphaned/outdated values and remove them if necessary
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

    this.logger.info('registerVideo', 'Video registered. current videoTabs:', this.videoTabs);
  }

  unregisterVideo(sender) {
    this.logger.info('unregisterVideo', 'Unregistering video.\nsender:', sender);
    if (this.videoTabs[sender.tab.id]) {
      if ( Object.keys(this.videoTabs[sender.tab.id].frames).length <= 1) {
        delete this.videoTabs[sender.tab.id]
      } else {
        if(this.videoTabs[sender.tab.id].frames[sender.frameId]) {
          delete this.videoTabs[sender.tab.id].frames[sender.frameId];
        }
      }
    }
    this.logger.info('unregisterVideo', 'Video has been unregistered. Current videoTabs:', this.videoTabs);
  }

  setSelectedTab(menu, subitem) {
    this.logger.info('setSelectedTab', 'saving selected tab for', menu, ':', subitem);
    this.selectedSubitem[menu] = subitem;
  }

  async getCurrentSite(sender: Runtime.MessageSender) {
    this.logger.info('getCurrentSite', 'received get-current-site ...');

    const site = await this.getVideoTab();

    // Don't propagate 'INVALID SITE' to the popup.
    if (site.host === 'INVALID SITE') {
      this.logger.info('getCurrentSite', 'Host is not valid — no info for current tab.');
      return;
    }

    const tabHostname = await this.getCurrentTabHostname();
    this.logger.info('getCurrentSite', 'Returning data:', {site, tabHostname});
    console.info('get-current-site : returning data:', {site, tabHostname});

    this.eventBus.send(
      'set-current-site',
      {
        site,
        tabHostname,
      },
      {
        comms: {
          forwardTo: 'popup'
        }
      }
    )
  }

  async getCurrentTab() {
    return (await chrome.tabs.query({active: true, currentWindow: true}))[0];
  }


  private populateFrameVideoStatus(tabId: number, hostnames: string[]) {
    const out: HostInfo[] = [];

    for (const host of hostnames) {
      let video = {hasVideo: false, minEnvironment: ExtensionEnvironment.Normal, maxEnvironment: ExtensionEnvironment.Fullscreen};

      for (const frameKey in this.videoTabs[tabId].frames) {
        const frame = this.videoTabs[tabId].frames[frameKey];

        if (frame.host === host) {
          video.hasVideo = true;
          if (frame.environment > video.maxEnvironment) {
            video.maxEnvironment = frame.environment;
          }
          if (frame.environment < video.minEnvironment) {
            video.minEnvironment = frame.environment;
          }
        }
      }

      out.push({
        host,
        ...video,
      })
    }

    return out;
  }

  private _lastVideoTabData: any | undefined;
  async getVideoTab() {
    // friendly reminder: if current tab doesn't have a video,
    // there won't be anything in this.videoTabs[this.currentTabId]

    const ctab = await this.getCurrentTab();

    if (!ctab || !ctab.id) {
      return {
        host: 'INVALID SITE',
        frames: [],
        hostnames: [],
      }
    }

    const hostnames = await this.comms.listUniqueFrameHosts();

    // this probably means we're inside a problematic page
    if (!this.videoTabs[ctab.id]) {
      return this._lastVideoTabData ??  {
        host: 'INVALID SITE',
        frames: [],
        hostnames: [],
      }
    }

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
      // this probably shouldn't ever run.
      return {
        host: this.extractHostname(ctab.url),
        hostnames: [],
        frames: [],
        selected: this.selectedSubitem
      }
    }

    // Ensure hostnames with videos come before hostnames without videos
    // Also ensure hostnames are sorted alphabetically
    const populatedHostnames = this.populateFrameVideoStatus(ctab.id, hostnames);
    populatedHostnames.sort((a: HostInfo, b: HostInfo) => {
      return a.hasVideo === b.hasVideo
        ? a.host === b.host ? 0 : a.host < b.host ? -1 : 1
        : a.hasVideo < b.hasVideo ? 1 : -1;
    });

    this._lastVideoTabData = {
      host: this.extractHostname(ctab.url),
      hostnames: populatedHostnames.map(x => x.host), // todo: try eliminating this
      populatedHostnames: populatedHostnames,
      selected: this.selectedSubitem
    };

    return this._lastVideoTabData;
  }

  async getCurrentTabHostname() {
    const activeTab = await this.activeTab;

    if (!activeTab || activeTab.length < 1) {
      return null;
    }

    const url = activeTab[0].url;

    if (!url) {
      console.log('no URL for active tab:', activeTab[0].url);
    }

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
