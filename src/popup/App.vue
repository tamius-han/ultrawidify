<template>
  <div class="popup">
    <div class="header">
      <span class="smallcaps">Ultrawidify</span>: <small>Quick settings</small>
    </div>

    <div class="flex flex-row">
      <!-- TABS/SIDEBAR -->
      <div id="tablist" class="flex flex-column flex-nogrow flex-noshrink">
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
            :class="{'selected-tab': selectedTab === 'site'}"
            @click="selectTab('site')"
        >
          <div class="">
            Site settings
          </div>
          <div v-if="selectedTab === 'site' && this.activeSites.length > 1"
               class=""
          >
            <small>Select site to control:</small>
            <div class="">
              <div v-for="site of activeSites"
                  :key="site.host"
                  class="tabitem"
                  :class="{'tabitem-selected': site.host === selectedSite}"
                  @click="selectSite(site.host)"
              >
                {{site.host}}
              </div>
            </div>
          </div>
        </div>
        <div class="menu-item"
            :class="{'selected-tab': selectedTab === 'video'}"
            @click="selectTab('video')"
        >
          <div class="">
            Video settings
          </div>
          <div v-if="selectedTab === 'video' && this.activeFrames.length > 0"
               class=""
          >
            <small>Select embedded frame to control:</small>
            <div class="">
              <div v-for="frame of activeFrames"
                   class="tabitem"
                   :class="{'tabitem-selected': selectedFrame === frame.id}"
                   :key="frame.id"
                   @click="selectFrame(frame.id)"
              >
                {{frame.label}} <span v-if="frame.name !== undefined && frame.color" :style="{'background-color': frame.color}">[{{frame.name}}]</span>
              </div>
            </div>
          </div>
        </div>

        <div class="menu-item"
            :class="{'selected-tab': selectedTab === 'site-details'}"
            @click="selectTab('site-details')"
        >
          <div class="">
            Video and player detection
          </div>
          <div v-if="selectedTab === 'site-details' && this.activeSites.length > 1"
               class=""
          >
            <small>Select site to control:</small>
            <div class="">
              <div v-for="site of activeSites"
                  :key="site.host"
                  class="tabitem"
                  :class="{'tabitem-selected': site.host === selectedSite}"
                  @click="selectSite(site.host)"
              >
                {{site.host}}
              </div>
            </div>
          </div>
        </div>

        <div class="menu-item"
            :class="{'selected-tab': selectedTab === 'about'}"
            @click="selectTab('about')"
        >
        <div class="">
            Report a problem
          </div>
          <div class="">
          </div>
        </div>
        <div class="menu-item"
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
      <div id="tab-content" class="flex-grow" style="max-width: 480px !important;">
        <VideoPanel v-if="settings && settings.active && selectedTab === 'video'"
                    class=""
                    :settings="settings"
                    :frame="selectedFrame"
                    :zoom="currentZoom"
                    @zoom-change="updateZoom($event)"
        />
        <DefaultSettingsPanel v-if="settings && settings.active && (selectedTab === 'site' || selectedTab === 'global')"
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
        <AboutPanel v-if="selectedTab === 'about'" />
        <Donate v-if="selectedTab === 'donate'" />
      </div>
    </div>
  </div>
</template>

<script>
import SiteDetailsPanel from './panels/SiteDetailsPanel.vue';
import Donate from '../common/misc/Donate.vue';
import Debug from '../ext/conf/Debug';
import BrowserDetect from '../ext/conf/BrowserDetect';
import Comms from '../ext/lib/comms/Comms';
import VideoPanel from './panels/VideoPanel';
import PerformancePanel from './panels/PerformancePanel';
import Settings from '../ext/lib/Settings';
import ExecAction from './js/ExecAction.js';
import DefaultSettingsPanel from './panels/DefaultSettingsPanel';
import AboutPanel from './panels/AboutPanel';

export default {
  data () {
    return {
      selectedTab: 'video',
      selectedFrame: '__all',
      selectedSite: '',
      activeFrames: [],
      activeSites: [],
      port: BrowserDetect.firefox ? browser.runtime.connect({name: 'popup-port'}) : chrome.runtime.connect({name: 'popup-port'}),
      comms: new Comms(),
      frameStore: {},
      frameStoreCount: 0,
      performance: {},
      site: null,
      currentZoom: 1,
      execAction: new ExecAction(),
      settings: new Settings(undefined, () => this.updateConfig()),
    }
  },
  async created() {
    await this.settings.init();
    this.port.onMessage.addListener( (m,p) => this.processReceivedMessage(m,p));
    this.execAction.setSettings(this.settings);

    // ensure we'll clean player markings on popup close
    window.addEventListener("unload", () => {
      this.port.postMessage({
        cmd: 'unmark-player',
        forwardToAll: true,
      });
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
  components: {
    VideoPanel,
    DefaultSettingsPanel,
    PerformancePanel,
    Debug,
    AboutPanel,
    Donate,
    SiteDetailsPanel,
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
        if (Debug.debug) {
          console.log("[popup.js] requesting current site");
        }
        this.port.postMessage({cmd: 'get-current-site'});
      } catch (e) {
        if (Debug.debug) {
          console.log("[popup::getSite] sending get-current-site failed for some reason. Reason:", e)
        }
      }
    },
    getRandomColor() {
      return `rgb(${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)})`;
    },
    selectTab(tab) {
      this.selectedTab = tab;
    },
    selectFrame(frame) {
      this.selectedFrame = frame;
    },
    async updateConfig() {

    },
    processReceivedMessage(message, port) {
      if (Debug.debug) {
        console.log("[popup.js] received message set-c", message);
        console.log("[popup.js] message cloned set-c", JSON.parse(JSON.stringify(message)));
      }

      if(message.cmd === 'set-current-site'){
        if (this.site) {
          if (!this.site.host) {
            // dunno why this fix is needed, but sometimes it is
            this.site.host = site.tabHostname;
          }
        }
        if (!this.site || this.site.host !== message.site.host) {
          this.port.postMessage({cmd: 'get-current-zoom'});
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
      } else if (message.cmd === 'set-current-zoom') {
        this.setCurrentZoom(message.zoom);
      } else if (message.cmd === 'performance-update') {
        for (let key in message.message) {
          this.performance[key] = message.message[key];
        }
      }

      return true;
    },
    loadFrames(videoTab) {
      if (videoTab.selected) {
        this.selectedSubitem = videoTab.selected;
        // selectedSubitemLoaded = true;
      }

      if (videoTab.frames.length < 2 || Object.keys(videoTab.frames).length < 2) {
        this.selectedFrame = '__all';
        return;
      }
      for (const frame in videoTab.frames) {

        if (frame && !this.frameStore[frame]) {
          const fs = {
            name: this.frameStoreCount++,
            color: this.getRandomColor()
          }

          this.frameStore[frame] = fs;

          this.port.postMessage({
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
    }
  }
}
</script>

<style src="../res/css/font/overpass.css"></style>
<style src="../res/css/font/overpass-mono.css"></style>
<style src="../res/css/flex.css"></style>
<style src="../res/css/common.scss"></style>

<style lang="scss" scoped>
html, body {
  width: 800px !important;
  max-width: 800px !important;
  padding: 0px;
  margin: 0px;
}

#tablist {
  min-width: 275px;
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

.menu-item-inline-desc{
  font-size: 0.60em;
  font-weight: 300;
  font-variant: normal;
}

.menu-item {
  padding-left: 15px;
  padding-top: 5px;
  padding-bottom: 5px;
  font-variant: small-caps;
  border-left: transparent 5px solid;
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
  margin-left: 1em;
  border-left: transparent 3px solid;
  padding-left: 12px;
  margin-left: -10px;
}

.tabitem-selected {
  color: #fff !important;
  background-color: initial;
  border-left: #f0c089 3px solid !important;
}
.tabitem-selected::before {
  padding-right: 0.5em;
}

.tabitem-iframe::after {
  content: "</>";
  padding-left: 0.33em;
}

.popup {
  max-width: 780px;
  // width: 800px;
  height: 600px;
}
</style>
