<template>
  <div
    v-if="settingsInitialized && uwTriggerZoneVisible"
    class="uw-hover uv-hover-trigger-region uw-clickable"
    :style="uwTriggerRegionConf"
    @mouseenter="showUwWindow"
  >
    <h1>Aspect ratio controls</h1>
    <div>Hover to activate</div>
  </div>



  <!-- sss -->

  <div
    v-if="settingsInitialized && uwWindowVisible"
    class="uw-window flex flex-column uw-clickable"
    :class="{'fade-out': uwWindowFadeOut}"
    @mouseenter="cancelUwWindowHide"
    @mouseleave="hideUwWindow"
  >
    <PlayerUIWindow
      :settings="settings"
      :eventBus="eventBus"
      :logger="logger"
      :in-player="true"
      :site="site"
      @close="uwWindowVisible = false"
      @preventClose="(event) => uwWindowFadeOutDisabled = event"
    ></PlayerUIWindow>
  </div>
</template>

<script>
import PlayerUIWindow from './src/PlayerUIWindow.vue'
import BrowserDetect from '../ext/conf/BrowserDetect';
import Logger from '../ext/lib/Logger';
import Settings from '../ext/lib/Settings';
import EventBus from '../ext/lib/EventBus';
import UIProbeMixin from './src/utils/UIProbeMixin';

export default {
  components: {
    PlayerUIWindow
  },
  mixins: [
    UIProbeMixin
  ],
  data() {
    return {
      uwTriggerZoneVisible: false,
      uwTriggerZoneTimeout: undefined,
      uwTriggerRegionConf: {
        left: "10%",
        top: "10%",
        height: "30%",
        width: "30%",
        maxWidth: "24rem",
        maxHeight: "13.37rem",
      },

      uwWindowFadeOutDisabled: false,
      uwWindowFadeOut: false,
      uwWindowCloseTimeout: undefined,
      uwWindowVisible: false,

      // component properties
      settings: {},
      BrowserDetect: BrowserDetect,
      settingsInitialized: false,
      eventBus: new EventBus(),
      logger: null,

      // NOTE: chromium doesn't allow us to access window.parent.location
      // meaning we will have to correct this value from our uwui-probe
      // messages ... which is a bummer.
      site: null,
      origin: '*', // will be set appropriately once the first uwui-probe event is received
      lastProbeTs: null,

      uiVisible: true,
      debugData: {
        resizer: {},
        player: {},
      },
      debugDataPrettified: '',

      statusFlags: {
        hasDrm: undefined,
      },

      tabs: [
        {id: 'videoSettings', label: 'Video settings', icon: 'crop'},
        {id: 'playerDetection', label: 'Player detection', icon: 'television-play'},
        {id: 'extensionSettings', label: 'Extension options', icon: 'cogs' },
        {id: 'autodetectionSettings', label: 'Autodetection options', icon: ''},
        {id: 'advancedOptions', label: 'Advanced options', icon: 'cogs' },
        {id: 'debugging', label: 'Debugging', icon: 'bug-outline' }
      ],
      selectedTab: 'videoSettings',
    };
  },
  computed: {
    // LPT: NO ARROW FUNCTIONS IN COMPUTED,
    // IS SUPER HARAM
    // THINGS WILL NOT WORK IF YOU USE ARROWS
    windowWidth() {
      return window.innerWidth;
    },
    windowHeight() {
      return window.innerHeight;
    },
  },
  watch: {
    showUi(visible) {
      if (visible !== undefined) {
        this.uiVisible = visible;
      }
    },
    resizerDebugData(newData) {
      this.debugData.resizer = newData;
      this.debugDataPrettified = JSON.stringify(this.debugData, null, 2);
    },
    playerDebugData(newData) {
      this.debugData.player = newData;
      this.debugDataPrettified = JSON.stringify(this.debugData, null, 2);
    }
  },

  async created() {
    this.logger = new Logger();

    // this prolly needs to be taken out
    await this.logger.init({
        allowLogging: true,
    });

    this.settings = new Settings({afterSettingsSaved: this.updateConfig, logger: this.logger});
    await this.settings.init();
    this.settingsInitialized = true;

    // set up communication with client script.
    // NOTE: companion onmousemove is set up in UIProbeMixin
    window.addEventListener('message', event => {
      this.handleMessage(event);
    });

    this.eventBus.subscribe('uw-config-broadcast', {function: (data) => {
      if (data.type === 'drm-status') {
        this.statusFlags.hasDrm = data.hasDrm;
      }
    }});
  },

  methods: {
    /**
     * Gets URL of the browser settings page (i think?)
     */
    getUrl(url) {
      return BrowserDetect.getURL(url);
    },

    /**
     * Mostly intended to process messages received via window.addEventListener('message').
     * This method should include minimal logic — instead, it should only route messages
     * to the correct function down the line.
     */
    handleMessage(event) {
      if (event.data.action === 'uwui-probe') {
        if (!this.site) {
          this.origin = event.origin;
          this.site = event.origin.split('//')[1];
        }
        this.handleProbe(event.data, event.origin); // handleProbe is defined in UIProbeMixin
      } else if (event.data.action === 'uw-bus-tunnel') {
        this.handleBusTunnelIn(event.data.payload);
      }
    },

    showUwWindow() {
      this.uwWindowFadeOut = false;
      this.uwWindowVisible = true;
      this.uwTriggerZoneVisible = false;

      // refresh DRM status
      this.eventBus.send('get-drm-status');
    },

    hideUwWindow() {
      if (this.uwWindowFadeOutDisabled) {
        return;
      }
      this.uwWindowCloseTimeout = setTimeout(() => this.uwWindowVisible = false, 1100);
      this.uwWindowFadeOut = true;
    },

    cancelUwWindowHide() {
      this.uwWindowFadeOut = false;
      clearTimeout(this.uwWindowCloseTimeout);
    },

    handleBusTunnelIn(payload) {
      this.eventBus.send(payload.action, payload.config);
    },

    selectTab(tab) {
      this.selectedTab = tab;
    }
  }
}
</script>

<style lang="scss" scoped>
@import 'res/css/uwui-base.scss';
@import 'res/css/colors.scss';
@import 'res/css/font/overpass.css';
@import 'res/css/font/overpass-mono.css';
@import 'res/css/common.scss';
@import './src/res-common/_variables';


.uw-hover {
  position: absolute;

  z-index: 999999999999999999;
}

.uv-hover-trigger-region {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  border: 0.5rem dashed #fff;
  color: #fff;
  backdrop-filter: blur(0.5rem) brightness(0.5);
}

.uw-window {
  position: absolute;

  top: 10%;
  left: 10%;

  z-index: 999999999999999999;

  width: 2500px;
  height: 1200px;
  max-width: 80%;
  max-height: 80%;

  pointer-events: all !important;

  opacity: 1;
  backdrop-filter: blur(16px) saturate(120%);

  &.fade-out {
    opacity: 0;
    transition: opacity 0.5s;
    transition-delay: 0.5s;
  }
}

</style>
