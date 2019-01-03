<template>
  <div>
    <div class="header">
      <span class="smallcaps">Ultrawidify</span>: <small>Quick settings</small>
    </div>

     <!-- TABS/SIDEBAR -->
    <div id="tablist" class="left-side">
      <div class="menu-item"
           :class="{'selected-tab': selectedTab === 'extension'}"
           @click="selectTab('extension')"
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
        <div class="">
        </div>
      </div>
      <div class="menu-item"
           :class="{'selected-tab': selectedTab === 'video'}"
           @click="selectTab('video')"
      >
        <div class="">
          Video settings
        </div>
        <div class="">
        </div>
        <div class="">
          <div v-for="frame of activeFrames">
          </div>
        </div>
      </div>
      <div class="menu-item"
           :class="{'selected-tab': selectedTab === 'about'}"
           @click="selectTab('about')"
      >
       <div class="">
          About
        </div>
        <div class="">
        </div>
      </div>
      <div class="menu-item"
           :class="{'selected-tab': selectedTab === 'beggathon'}"
           @click="selectTab('beggathon')"
      >
        <div class="">
          Donate
        </div>
        <div class="">
        </div>
      </div>
    </div>

     <!-- PANELS/CONTENT -->
    <div id="tab-content" class="right-side">
      <VideoPanel v-if="settings && settings.active && selectedTab === 'video'"
                  class=""
                  :settings="settings"
                  :frame="selectedFrame"
                  :zoom="currentZoom"
                  @zoom-change="updateZoom($event)"
      >
      </VideoPanel>
    </div>
  </div>
</template>

<script>
import Debug from '../ext/conf/Debug';
import BrowserDetect from '../ext/conf/BrowserDetect';
import Comms from '../ext/lib/comms/Comms';
import VideoPanel from './panels/VideoPanel';
import Settings from '../ext/lib/Settings';

export default {
  data () {
    return {
      selectedTab: 'video',
      selectedFrame: '__all',
      settings: {},
      activeFrames: [],
      port: BrowserDetect.firefox ? browser.runtime.connect({name: 'popup-port'}) : chrome.runtime.connect({name: 'popup-port'}),
      comms: new Comms(),
      frameStore: {},
      frameStoreCount: 0,
      site: null,
      currentZoom: 1,
    }
  },
  async created() {
    const ns = new Settings(undefined, () => this.updateConfig());
    await ns.init();
    this.settings = ns;
    this.port.onMessage.addListener( (m,p) => this.processReceivedMessage(m,p));
  },
  components: {
    VideoPanel,
  },
  methods: {
    selectTab(tab) {
      this.selectedTab = tab;
    },
    selectFrame(frame) {
      this.selectedFrame = frame;
    },
    processReceivedMessage(message, port) {
      if (Debug.debug) {
        console.log("[popup.js] received message", message);
      }

      if(message.cmd === 'set-current-site'){
        if (this.site) {
          if (!site.host) {
            // dunno why this fix is needed, but sometimes it is
            this.site.host = site.tabHostname;
          }
        }
        if (!this.site || this.site.host !== message.site.host) {
          this.port.postMessage({cmd: 'get-current-zoom'});
        }
        this.site = message.site;
        // loadConfig(site.host);
        // loadFrames(site);
      } else if (message.cmd === 'set-current-zoom') {
        setCurrentZoom(message.zoom);
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
  width: 780px !important;
  max-width: 800px !important;
  padding: 0px;
  margin: 0px;
}

.header {
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

.left-side {
  display: inline-block;
  width: 39%;
  float: left;
  font-size: 1.6em;
}

.right-side {
  display: inline-block;
  width: 60%;
  float: right;
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
  font-size: 0.69em;
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
</style>
