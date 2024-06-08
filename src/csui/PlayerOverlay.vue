<template>

  <div
    v-if="settingsInitialized && uwTriggerZoneVisible && !isGlobal"
    class="uw-hover uv-hover-trigger-region uw-clickable"
    :style="uwTriggerRegionConf"
    @mouseenter="showUwWindow"
  >
    <h1>Aspect ratio controls</h1>
    <div>Hover to activate</div>
  </div>

  <div
    v-if="settingsInitialized && uwWindowVisible"
    class="uw-window flex flex-column uw-clickable"
    :class="{'fade-out': uwWindowFadeOut}"
    @mouseenter="cancelUwWindowHide"
    @mouseleave="hideUwWindow()"
  >
    <PlayerUIWindow
      :settings="settings"
      :eventBus="eventBus"
      :logger="logger"
      :in-player="!isGlobal"
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

      isGlobal: true,
      disabled: false,

      uiVisible: true,
      debugData: {
        resizer: {},
        player: {},
      },
      debugDataPrettified: '',

      // in global overlay, this property is used to determine
      // if closing the window should emit uw-set-ui-state
      // event on eventBus
      showPlayerUIAfterClose: false,

      statusFlags: {
        hasDrm: undefined,
      },

      saveState: {},

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


    this.eventBus.subscribe('uw-set-ui-state', { function: (data) => {
      if (data.globalUiVisible !== undefined) {
        if (this.isGlobal) {
          if (data.globalUiVisible) {
            this.showUwWindow();
          } else {
            this.hideUwWindow(true);
          }
          // this.showPlayerUIAfterClose = data.showPlayerUIAfterClose;
        } else {
          // non global UIs are hidden while global overlay
          // is visible and vice versa
          // this.disabled = data.globalUiVisible;
          this.saveState = {
            uwWindowVisible: this.uwWindowVisible,
            uwWindowFadeOutDisabled: this.uwWindowFadeOutDisabled,
            uwWindowFadeOut: this.uwWindowFadeOut
          };
          this.uwWindowFadeOutDisabled = false;
          this.hideUwWindow(true);
        }
      }
    }});

    this.eventBus.subscribe(
      'uw-restore-ui-state',
      {
        function: (data) => {
          if (this.saveState) {
            if (this.saveState.uwWindowVisible) {
              this.showUwWindow();
            }
            this.uwWindowFadeOutDisabled = this.saveState.uwWindowFadeOutDisabled;
            this.uwWindowFadeOut = this.saveState.uwWindowFadeOut;
          }
          this.saveState = {};
        }
      }
    );

    this.sendToParentLowLevel('uwui-get-role', null);
    this.sendToParentLowLevel('uwui-get-theme', null);

    //

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
      switch (event.data.action) {
        case 'uwui-probe':
          if (!this.site) {
            this.origin = event.origin;
            this.site = event.origin.split('//')[1];
          }
          return this.handleProbe(event.data, event.origin); // handleProbe is defined in UIProbeMixin
        case 'uw-bus-tunnel':
          return this.handleBusTunnelIn(event.data.payload);
        case 'uwui-set-role':
          this.isGlobal = event.data.payload.role === 'global';
          this.sendToParentLowLevel('uwui-interface-ready', true);
          break;
      }
    },

    /**
     * Sends message to parent _without_ using event bus.
     */
    sendToParentLowLevel(action, payload, lowLevelExtras = {}) {
      window.parent.postMessage(
        {
          action, payload, ...lowLevelExtras
        },
        '*'
      );
    },

    showUwWindow() {
      this.uwWindowFadeOut = false;
      this.uwWindowVisible = true;
      this.uwTriggerZoneVisible = false;

      // refresh DRM status
      this.eventBus.send('get-drm-status');

      // if (this.isGlobal) {
      //   this.sendToParentLowLevel('uwui-clickable', undefined, {clickable: true});
      // }
    },

    hideUwWindow(skipTimeout = false) {
      if (this.uwWindowFadeOutDisabled) {
        return;
      }

      const timeout = skipTimeout ? 0 : 1100;

      this.uwWindowCloseTimeout = setTimeout(
        () => {
          this.uwWindowVisible = false;

          // Global UI has some extra housekeeping to do when window gets hidden
          if (this.isGlobal) {
            this.sendToParentLowLevel('uwui-global-window-hidden', {});
          }
        },
        timeout
      );
      this.uwWindowFadeOut = true;
    },

    cancelUwWindowHide() {
      this.uwWindowFadeOut = false;
      clearTimeout(this.uwWindowCloseTimeout);
    },

    handleBusTunnelIn(payload) {
      this.eventBus.send(payload.action, payload.config, payload.routingData);
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
