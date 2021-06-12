<template>
  <!--
    NOTE — the code that makes ultrawidify popup work in firefox regardless of whether the
    extension is being displayed in a normal or a small/overflow popup breaks the popup
    behaviour on Chrome (where the popup would never reach the full width of 800px)

    Since I'm tired and the hour is getting late, we'll just add an extra CSS class for
    non-firefox builds of this extension and be done with it. No need to complicate things
    further than that.
  -->
  <div v-if="settingsInitialized" 
       class="popup flex flex-column no-overflow"
       :class="{'popup-chrome': ! BrowserDetect.firefox}"
  >
    <div class="flex-row flex-nogrow flex-noshrink relative"
         :class="{'header': !narrowPopup, 'header-small': narrowPopup}"
    >
      <span class="smallcaps">Ultrawidify</span>: <small>Quick settings</small>
      <div class="absolute channel-info" v-if="BrowserDetect.processEnvChannel !== 'stable'">
        Build channel: {{BrowserDetect.processEnvChannel}}
      </div>
    </div>
    <div 
      v-if="narrowPopup"
      class="w100 show-more flex flex-row flex-center flex-cross-center menu-button"
      @click="toggleSideMenu()"
    >
      <Icon v-if="!sideMenuVisible" icon="list" />
      <Icon v-else icon="x" />
      <div>Menu</div>
    </div>
    <div class="flex flex-row body no-overflow flex-grow">
      <!-- TABS/SIDEBAR -->
      <div id="tablist"
           v-show="!narrowPopup || sideMenuVisible"
           class="flex flex-column flex-nogrow flex-noshrink h100"
           :class="{'w100': narrowPopup}"
      >
        <div class="menu-item"
            :class="{'selected-tab': selectedTab === 'global'}"
            @click="selectTab('global')"
        >
          <div class="">
            Extension settings
          </div>
          <div class="">
          </div>
        </div>
        <div class="menu-item"
            :class="{'selected-tab': selectedTab === 'site', 'disabled': siteTabDisabled}"
            @click="selectTab('site')"
        >
          <div class="">
            Site settings
          </div>
          <div v-if="selectedTab === 'site' && activeSites.length > 1"
               class=""
          >
            <small>Select site to control:</small>
            <div class="site-list overflow-y-auto scrollbar-darker rtl no-overflow-x">
              <div v-for="site of activeSites"
                  :key="site.host"
                  class="tabitem ltr"
                  :class="{
                    'tabitem-selected': site.host === selectedSite,
                    'tabitem-disabled': (settings && !settings.canStartExtension(site.host))
                  }"
                  @click="selectSite(site.host)"
              >
                {{site.host}}
              </div>
            </div>
          </div>
        </div>
        <div class="menu-item"
            :class="{'selected-tab': selectedTab === 'video', 'disabled': !canShowVideoTab.canShow}"
            @click="selectTab('video')"
        >
          <div class="">
            Video settings <span v-if="canShowVideoTab.canShow && canShowVideoTab.warning" class="warning-color">⚠</span>
          </div>
          <div v-if="selectedTab === 'video' && activeFrames.length > 0"
               class=""
          >
            <small>Select embedded frame to control:</small>
            <div class="site-list overflow-y-auto scrollbar-darker rtl no-overflow-x">
              <div v-for="frame of activeFrames"
                   class="tabitem ltr"
                   :class="{
                     'tabitem-selected': selectedFrame === frame.id,
                     'disabled': !isDefaultFrame(frame.id) && (settings && !settings.canStartExtension(frame.label))
                   }"
                   :key="frame.id"
                   @click="selectFrame(frame.id)"
              >
                {{frame.label}} <span v-if="frame.name !== undefined && frame.color" :style="{'background-color': frame.color}">[{{frame.name}}]</span>
              </div>
            </div>
          </div>
        </div>

        <div class="menu-item experimental"
            :class="{'selected-tab': selectedTab === 'site-details'}"
            @click="selectTab('site-details')"
        >
          <div class="">
            Advanced settings
          </div>
          <div v-if="selectedTab === 'site-details' && activeSites.length > 1"
               class=""
          >
            <small>Select site to control:</small>
            <div class="site-list overflow-y-auto scrollbar-darker rtl no-overflow-x">
              <div v-for="site of activeSites"
                  :key="site.host"
                  class="tabitem ltr"
                  :class="{'tabitem-selected': site.host === selectedSite}"
                  @click="selectSite(site.host)"
              >
                {{site.host}}
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-grow">
          <!-- this is spacer -->
        </div>
        <div class="menu-item menu-item-darker"
            :class="{'selected-tab': selectedTab === 'whats-new'}"
            @click="selectTab('whats-new')"
        >
          <div :class="{'new': settings && settings.active && !settings.active.whatsNewChecked}"
            >
            What's new?
          </div>
          <div class="">
          </div>
        </div>

        <div class="menu-item menu-item-darker"
            :class="{'selected-tab': selectedTab === 'about'}"
            @click="selectTab('about')"
        >
          <div class="">
            Report a problem
          </div>
          <div class="">
          </div>
        </div>
        <div class="menu-item menu-item-darker"
            :class="{'selected-tab': selectedTab === 'donate'}"
            @click="selectTab('donate')"
        >
          <div class="">
            Donate
          </div>
          <div class="">
          </div>
        </div>
      </div>

      <!-- PANELS/CONTENT -->
      <div id="tab-content" 
           v-show="!(narrowPopup && sideMenuVisible)"
           class="flex-grow h100 overflow-y-auto"
           :class="{'narrow-content': narrowPopup}"
      >
        <VideoPanel v-if="settings?.active && selectedTab === 'video'"
                    class=""
                    :someSitesDisabledWarning="canShowVideoTab.warning"
                    :settings="settings"
                    :frame="selectedFrame"
                    :zoom="currentZoom"
                    @zoom-change="updateZoom($event)"
        />
        <DefaultSettingsPanel v-if="settings?.active && (selectedTab === 'global' || selectedTab === 'site')"
                              class=""
                              :settings="settings"
                              :scope="selectedTab"
                              :site="selectedSite"
        />
        <SiteDetailsPanel v-if="settings && settings.active && selectedTab === 'site-details' "
                              class=""
                              :settings="settings"
                              :site="selectedSite"
        />
        <PerformancePanel v-if="selectedTab === 'performance-metrics'" 
                          :performance="performance" />
        <WhatsNewPanel v-if="selectedTab === 'whats-new'" />
        <AboutPanel v-if="selectedTab === 'about'" />
        <Donate v-if="selectedTab === 'donate'" />
      </div>
    </div>
  </div>
</template>

<script>
import Icon from '../common/components/Icon.vue'
import WhatsNewPanel from './panels/WhatsNewPanel.vue';
import SiteDetailsPanel from './panels/SiteDetailsPanel.vue';
import Donate from '../common/misc/Donate.vue';
import Debug from '../ext/conf/Debug';
import BrowserDetect from '../ext/conf/BrowserDetect';
import Comms from '../ext/lib/comms/Comms';
import VideoPanel from './panels/VideoPanel';
import PerformancePanel from './panels/PerformancePanel';
import Settings from '../ext/lib/Settings';
import ExecAction from './js/ExecAction';
import DefaultSettingsPanel from './panels/DefaultSettingsPanel';
import AboutPanel from './panels/AboutPanel';
import ExtensionMode from '../common/enums/ExtensionMode.enum';
import Logger from '../ext/lib/Logger';
import {ChromeShittinessMitigations as CSM} from '../common/js/ChromeShittinessMitigations';
import { browser } from 'webextension-polyfill-ts';

export default {
  data () {
    return {
      selectedTab: 'video',
      selectedFrame: '__all',
      selectedSite: '',
      activeFrames: [],
      activeSites: [],
      comms: new Comms(),
      frameStore: {},
      frameStoreCount: 0,
      performance: {},
      site: null,
      currentZoom: 1,
      execAction: new ExecAction(),
      settings: {},
      settingsInitialized: false,
      logger: {},
      siteTabDisabled: false,
      videoTabDisabled: false,
      canShowVideoTab: {canShow: true, warning: true},
      showWhatsNew: false,
      BrowserDetect: BrowserDetect,
      narrowPopup: null,
      sideMenuVisible: null,
    }
  },
  async created() {
    this.logger = new Logger();
    await this.logger.init({
        allowLogging: true,
    });

    this.settings = new Settings({afterSettingsSaved: () => this.updateConfig(), logger: this.logger});
    await this.settings.init();
    this.settingsInitialized = true;

    // const port = BrowserDetect.firefox ? browser.runtime.connect({name: 'popup-port'}) : chrome.runtime.connect({name: 'popup-port'});
    const port = browser.runtime.connect({name: 'popup-port'});
    port.onMessage.addListener( (m,p) => this.processReceivedMessage(m,p));
    CSM.setProperty('port', port);

    this.execAction.setSettings(this.settings);

    // ensure we'll clean player markings on popup close
    window.addEventListener("unload", () => {
      CSM.port.postMessage({
        cmd: 'unmark-player',
        forwardToAll: true,
      });
      if (BrowserDetect.anyChromium) {
        chrome.extension.getBackgroundPage().sendUnmarkPlayer({
          cmd: 'unmark-player',
          forwardToAll: true,
        });
      }
    });

    // get info about current site from background script
    while (true) {
      try {
        this.getSite();
      } catch (e) {

      }
      await this.sleep(5000);
    } 
  },
  async updated() {
    const body = document.getElementsByTagName('body')[0];

    // ensure that narrowPopup only gets set the first time the popup renders
    // if popup was rendered before, we don't do anything because otherwise
    // we'll be causing an unwanted re-render
    // 
    // another thing worth noting — the popup gets first initialized with
    // offsetWidth set to 0. This means proper popup will be displayed as a
    // mini popup if we don't check for that.
    if (this.narrowPopup === null && body.offsetWidth > 0) {
      this.narrowPopup = body.offsetWidth < 600;
    }
  },
  components: {
    VideoPanel,
    DefaultSettingsPanel,
    PerformancePanel,
    Debug,
    BrowserDetect,
    AboutPanel,
    Donate,
    SiteDetailsPanel,
    WhatsNewPanel,
    Icon,
  },
  methods: {
    async sleep(t) {
      return new Promise( (resolve,reject) => {
        setTimeout(() => resolve(), t);
      });
    },
    toObject(obj) {
      return JSON.parse(JSON.stringify(obj));
    },
    getSite() {
      try {
        this.logger.log('info','popup', '[popup::getSite] Requesting current site ...')
        CSM.port.postMessage({cmd: 'get-current-site'});
      } catch (e) {
        this.logger.log('error','popup','[popup::getSite] sending get-current-site failed for some reason. Reason:', e);
      }
    },
    getRandomColor() {
      return `rgb(${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)})`;
    },
    selectTab(tab) {
      this.selectedTab = tab;
      if (tab === 'whats-new') {
        this.settings.active.whatsNewChecked = true;
        this.settings.save();
      }
      this.toggleSideMenu(false);
    },
    selectFrame(frame) {
      this.selectedFrame = frame;
    },
    async updateConfig() {
      // when this runs, a site could have been enabled or disabled
      // this means we must update canShowVideoTab
      const settings = this.settings;
      this.settings = null;
      this.updateCanShowVideoTab();

      this.$nextTick(() => {
        this.settings = settings;
        this.updateCanShowVideoTab();
      });
    },
    updateCanShowVideoTab() {
      let canShow = false;
      let warning = false;
      let t;

      if (!this.settings) {
        this.canShowVideoTab = {canShow: true, warning: false};
        return;
      }
      for (const site of this.activeSites) {
        t = this.settings.canStartExtension(site.host);
        canShow = canShow || t;
        warning = warning || !t;
      }
      if (t === undefined) {
        // something isn't the way it should be. Show sites.
        this.canShowVideoTab = {canShow: true, warning: true};
        return;
      }
      this.canShowVideoTab = {canShow: canShow, warning: warning};
    },
    processReceivedMessage(message, port) {
      this.logger.log('info', 'popup', '[popup::processReceivedMessage] received message:', message)

      if (message.cmd === 'set-current-site'){
        if (this.site) {
          if (!this.site.host) {
            // dunno why this fix is needed, but sometimes it is
            this.site.host = site.tabHostname;
          }
        }
        if (!this.site || this.site.host !== message.site.host) {
          CSM.port.postMessage({cmd: 'get-current-zoom'});
        }
        this.site = message.site;

        // update activeSites
        // this.activeSites = this.activeSites.filter(x => x.host !== message.site);

        // add current site
        // this.activeSites = unshift({
        //   host: message.site.host,
        //   isIFrame: false,  // currently unused
        // });
        this.selectedSite = this.selectedSite || message.site.host;

        // loadConfig(site.host); TODO
        this.loadFrames(this.site);
        this.showFirstTab(this.site);
      } else if (message.cmd === 'set-current-zoom') {
        this.setCurrentZoom(message.zoom);
      } else if (message.cmd === 'performance-update') {
        for (let key in message.message) {
          this.performance[key] = message.message[key];
        }
      }

      return true;
    },
    showFirstTab(videoTab) {
      // determine which tab to show.
      // Extension global disabled — show 'extension settings'
      // Extension site disabled, no embedded videos — show 'site settings'
      // Extension site disabled, embedded videos from non-blacklisted hosts — show video settings
      // Extension site enabled — show video settings

      // note: this if statement is ever so slightly unnecessary
      if (! this.settings.canStartExtension('@global')) {
        // canStartExtension and getExtensionMode return disabled/false for non-whitelisted
        // sites, even if extension mode is set to "whitelist only." This is problematic
        // because in order to whitelist a given site, we need to set extension to global-
        // enabled, whitelist the site, and then set extension to whitelist only. This makes
        // for a bad user experience, so let's fix this.
        if (this.settings.active.sites['@global'].mode === ExtensionMode.Disabled) {
          if (this.selectedTab === 'video' || this.selectedTab === 'site') {
            this.selectTab('global');
          }
          this.siteTabDisabled = true;
          this.videoTabDisabled = true;
          return;
        }
      }

      this.siteTabDisabled = false;;
      if (! this.settings.canStartExtension(this.site.host)) {
        if (videoTab.frames.length > 1) {
          for (const frame of videoTab.frames) {
            if (this.settings.canStartExtension(frame.host)) {
              this.videoTabDisabled = false;
              // video is selected by default, so no need to reselect it
              // and if video is not selected, the popup would switch to 'video'
              // tab once every 5 seconds. We don't want that.
              // this.selectTab('video');
              return;
            }
          }
        }
        this.videoTabDisabled = true;
        if (this.selectedTab === 'video') {
          this.selectTab('site');
        }
        return;
      }
      this.videoTabDisabled = false;
    },
    isDefaultFrame(frameId) {
      return frameId === '__playing' || frameId === '__all';
    },
    loadFrames(videoTab) {
      if (videoTab.selected) {
        this.selectedSubitem = videoTab.selected;
        // selectedSubitemLoaded = true;
      }

      if (videoTab.frames.length < 2 || Object.keys(videoTab.frames).length < 2) {
        this.selectedFrame = '__all';
        this.activeSites = [{
          host: this.site.host,
          isIFrame: false,  // not used tho. Maybe one day
        }];
        this.updateCanShowVideoTab(); // update whether video tab can be shown
        return;
      }
      for (const frame in videoTab.frames) {

        if (frame && !this.frameStore[frame]) {
          const fs = {
            name: this.frameStoreCount++,
            color: this.getRandomColor()
          }

          this.frameStore[frame] = fs;

          CSM.port.postMessage({
            cmd: 'mark-player',
            forwardToContentScript: true,
            targetTab: videoTab.id,
            targetFrame: frame,
            name: fs.name,
            color: fs.color
          });
        }
      }

      this.activeFrames = [{id: '__all', label: 'All'},{id: '__playing', label: 'Currently playing'}];
      this.activeSites = [{
        host: this.site.host,
        isIFrame: false,  // not used tho. Maybe one day
      }];
      this.selectedSite = this.selectedSite || this.site.host;

      for (const frame in videoTab.frames) {
        this.activeFrames.push({
          id: `${this.site.id}-${frame}`,
          label: videoTab.frames[frame].host,
          ...this.frameStore[frame],
        })

        // only add each host once at most
        if (!this.activeSites.find(x => x.host === videoTab.frames[frame].host)) {
          this.activeSites.push({
            host: videoTab.frames[frame].host,
            isIFrame: undefined // maybe one day
          });
        }
      }

      // update whether video tab can be shown
      this.updateCanShowVideoTab();
    },
    getRandomColor() {
      return `rgb(${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)})`;
    },
    setCurrentZoom(nz) {
      this.currentZoom = nz;
    },
    updateZoom(nz){
      this.currentZoom = nz;
    },
    selectFrame(id){
      this.selectedFrame = id;
    },
    selectSite(host) {
      this.selectedSite = host;
    },
    toggleSideMenu(visible) {
      this.sideMenuVisible = visible ?? !this.sideMenuVisible;
    }
  }
}
</script>

<style src="../res/css/font/overpass.css"></style>
<style src="../res/css/font/overpass-mono.css"></style>
<style src="../res/css/flex.scss"></style>
<style src="../res/css/common.scss"></style>

<style lang="scss" scoped>
html {
  // width: 800px !important;
  // max-width: 800px !important;
  padding: 0px;
  margin: 0px;
}

.zero-width {
  width: 0px !important;
  overflow: hidden;
}

.header .header-small, .narrow-content {
  padding: 8px;
}

#tablist {
  min-width: 275px;
  max-width: 300px;
}

.header {
  overflow: hidden;
  background-color: #7f1416;
  color: #fff;
  margin: 0px;
  margin-top: 0px;
  padding-top: 8px;
  padding-left: 15px;
  padding-bottom: 1px;
  font-size: 2.7em;
}
.header-small {
  overflow: hidden;
  background-color: #7f1416;
  color: #fff;
  margin: 0px;
  margin-top: 0px;
  padding-top: 8px;
  padding-left: 15px;
  padding-bottom: 1px;
  font-size: 1.27em;
}


.menu-item-inline-desc{
  font-size: 0.60em;
  font-weight: 300;
  font-variant: normal;
}

.menu-item {
  flex-grow: 0;
  padding-left: 15px;
  padding-top: 5px;
  padding-bottom: 5px;
  font-variant: small-caps;
  border-left: transparent 5px solid;
  cursor: pointer;
  user-select: none;
}

.menu-item-darker {
  color: #999;
}

.suboption {
  display: block;
  padding-left: 15px;
  padding-right: 15px;
  padding-top: 5px;
  padding-bottom: 20px;
  min-height: 250px;
}


#no-videos-display {
  height: 100%;
  padding-top: 50px;
/*       text-align: center; */
}

.tabitem-container {
  padding-top: 0.5em;
}

.selected-tab {
  background-color: initial;
  border-left: #f18810 5px solid;
}

.tabitem {
  font-variant: normal;
  // font-size: 0.69em;
  // margin-left: 16px;
  border-left: transparent 3px solid;
  padding-left: 12px;
  margin-left: -10px;
}

.site-list {
  max-height: 200px;
}

.tabitem-selected {
  color: #fff !important;
  background-color: initial;
  border-left: #f0c089 3px solid !important;
}

.tabitem-selected::before {
  padding-right: 8px;
}

.tabitem-disabled {
  color: #cc3b0f !important;
}

.tabitem-iframe::after {
  content: "</>";
  padding-left: 0.33em;
}

.menu-button {
  margin-bottom: 4px;
  padding: 4px;
  border-bottom: #f18810 1px solid !important;
  font-size: 1.5rem !important;
  cursor: pointer;
  user-select: none;;
}

.popup {
  height: 600px;
}

/**
  This was written at the top, but it's worth repeating.

  NOTE — the code that makes ultrawidify popup work in firefox regardless of whether the
  extension is being displayed in a normal or a small/overflow popup breaks the popup
  behaviour on Chrome (where the popup would never reach the full width of 800px)

  Since I'm tired and the hour is getting late, we'll just add an extra CSS class for
  non-firefox builds of this extension and be done with it. No need to complicate things
  further than that.

  It also seems that Chrome doesn't like if we set the width of the popup all the way to 
  800px (probably something something scrollbar), so let's just take away a few px.
 */
.popup-chrome {
  width: 780px !important;
}

.relative {
  position: relative;
}
.absolute {
  position: absolute;
}
.channel-info {
  height: 0px;
  right: 1.5rem;
  bottom: 0.85rem;
  font-size: 0.75rem;
}

.show-more {
  padding-top: 12px;
  font-size: 0.9rem;
}
</style>
