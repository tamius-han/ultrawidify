<template>
  <div
    class="context-spawn uw-ui-trigger"
    style="z-index: 1000"
    @mouseenter="(ev) => setTriggerZoneActive(true, ev)"
    @mouseleave="(ev) => setTriggerZoneActive(false, ev)"
  >
    <div
      class="spawn-container uw-trigger"
      :style="triggerZoneStyles"
    >
      &nbsp;
    </div>
  </div>

  <div
    v-if="contextMenuActive || settingsInitialized && uwTriggerZoneVisible && !isGlobal"
    class="context-spawn uw-clickable"
    style="z-index: 1001"
    @mouseenter="preventContextMenuHide()"
    @mouseleave="allowContextMenuHide()"
  >
    <GhettoContextMenu
      alignment="right" class="uw-menu"
      @mouseenter="newFeatureViewUpdate('uw6.ui-popup')"
    >
      <template v-slot:activator>
        <div class="context-item">
          Ultrawidify
        </div>
        </template>
      <slot>
        <div class="menu-width">
        <GhettoContextMenuItem :disableHover="true" :css="{'ard-blocked': true}">
          <div v-if="statusFlags.hasDrm || true" class="smallcaps text-center">
            <b>NOTE:</b><br/>
            <b>Autodetection<br/>blocked by website</b>
          </div>
          <div>

          </div>
        </GhettoContextMenuItem>
        <GhettoContextMenu alignment="right">
          <template v-slot:activator>
            Crop
          </template>
          <slot>
            <GhettoContextMenuOption
              v-for="(command, index) of settings?.active.commands.crop"
              :key="index"
              :label="command.label"
              :shortcut="getKeyboardShortcutLabel(command)"
              @click="execAction(command)"
            >
            </GhettoContextMenuOption>
          </slot>
        </GhettoContextMenu>
        <GhettoContextMenu alignment="right">
          <template v-slot:activator>
            Stretch
          </template>
          <slot>
            <GhettoContextMenuOption
              v-for="(command, index) of settings?.active.commands.stretch"
              :key="index"
              :label="command.label"
              :shortcut="getKeyboardShortcutLabel(command)"
              @click="execAction(command)"
            >
            </GhettoContextMenuOption>
          </slot>
        </GhettoContextMenu>
        <GhettoContextMenu alignment="right">
          <template v-slot:activator>
            <div class="context-item">
              Align
            </div>
          </template>
          <slot>
            <GhettoContextMenuItem :disableHover="true" :css="{'reduced-padding': true}">
              <AlignmentOptionsControlComponent
                :eventBus="eventBus"
              >
              </AlignmentOptionsControlComponent>
            </GhettoContextMenuItem>
          </slot>
        </GhettoContextMenu>

        <!-- shortcut for configuring UI  -->
        <GhettoContextMenuOption
          v-if="settings.active.newFeatureTracker?.['uw6.ui-popup']?.show > 0"
          @click="showUwWindow('playerUiSettings')"
        >
          <span style="color: #fa6;">I hate this popup<br/></span>
          <span style="font-size: 0.8em">
            <span style="text-transform: uppercase; font-size: 0.8em">
              <a @click="showUwWindow('playerUiSettings')">
                Do something about it
              </a> × <a @click="acknowledgeNewFeature('uw6.ui-popup')">keep the popup</a>
            </span>
            <br/>
            <span style="opacity: 0.5">This menu option will show {{settings.active.newFeatureTracker?.['uw6.ui-popup']?.show}} more<br/> times; or until clicked or dismissed.<br/>
            Also accessible via <span style="font-variant: small-caps">extension settings</span>.
            </span>
          </span>
        </GhettoContextMenuOption>

        <!--  -->

        <GhettoContextMenuOption
          @click="showUwWindow()"
          label="Extension settings"
        >
        </GhettoContextMenuOption>
        <GhettoContextMenuOption
          @click="showUwWindow('about')"
          label="Not working?"
        >
        </GhettoContextMenuOption>
        </div>
      </slot>
    </GhettoContextMenu>
  </div>


  <div
    v-if="settingsInitialized && uwWindowVisible"
    class="uw-window flex flex-col uw-clickable"
    :class="{'fade-out': uwWindowFadeOut}"
  >
    <PlayerUIWindow
      :settings="settings"
      :eventBus="eventBus"
      :logger="logger"
      :in-player="!isGlobal"
      :site="site"
      :defaultTab="defaultWindowTab"
      @close="uwWindowVisible = false"
      @preventClose="(event) => uwWindowFadeOutDisabled = event"
    ></PlayerUIWindow>
  </div>
</template>

<script>
import PlayerUIWindow from './src/PlayerUIWindow.vue';
import GhettoContextMenu from './src/components/GhettoContextMenu.vue';
import GhettoContextMenuItem from './src/components/GhettoContextMenuItem.vue';
import GhettoContextMenuOption from './src/components/GhettoContextMenuOption.vue';
import AlignmentOptionsControlComponent from './src/PlayerUiPanels/AlignmentOptionsControlComponent.vue';
import BrowserDetect from '../ext/conf/BrowserDetect';
import Logger from '../ext/lib/Logger';
import Settings from '../ext/lib/Settings';
import EventBus from '../ext/lib/EventBus';
import UIProbeMixin from './src/utils/UIProbeMixin';
import KeyboardShortcutParserMixin from './src/utils/KeyboardShortcutParserMixin';
import CommsMixin from './src/utils/CommsMixin';

export default {
  components: {
    PlayerUIWindow,
    GhettoContextMenu,
    GhettoContextMenuItem,
    GhettoContextMenuOption,
    AlignmentOptionsControlComponent,
  },
  mixins: [
    UIProbeMixin,
    KeyboardShortcutParserMixin,
    CommsMixin
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

      contextMenuActive: false,
      triggerZoneActive: false,

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
      defaultWindowTab: 'videoSettings',

      saveState: {},
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
     * Handles trigger zone
     */
    handleTriggerZone(mouseInside) {
      console.log('handing trigger zone!', mouseInside);
      // this.triggerZoneActive = mouseInside;
    },

    acknowledgeNewFeature(featureKey) {
      delete this.settings.active.newFeatureTracker[featureKey];
      this.settings.saveWithoutReload();
    },
    newFeatureViewUpdate(featureKey) {
      if (!this.settings.active.newFeatureTracker[featureKey]) {
        return;
      }
      try {
        this.settings.active.newFeatureTracker[featureKey].show--;
        this.settings.saveWithoutReload();

        if (this.settings.active.newFeatureTracker[featureKey]?.show < 0) {
          this.acknowledgeNewFeature(featureKey);
        }
      } catch (e) {
        // do nothing
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

    preventContextMenuHide() {
      this.contextMenuActive = true;
    },
    allowContextMenuHide() {
      this.contextMenuActive = false;
    },

    setTriggerZoneActive(active, event) {
      this.triggerZoneActive = active;
    },

    showUwWindow(tab) {
      this.defaultWindowTab = tab; // can be undefined

      this.uwWindowFadeOut = false;
      this.uwWindowVisible = true;
      this.uwTriggerZoneVisible = false;
      this.allowContextMenuHide();

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
    }
  }
}
</script>
<style lang="scss">
.ard-blocked {
  color: rgb(219, 125, 48) !important;
  background-color: rgba(0,0,0,0.85) !important;
}
</style>
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

.reduced-padding {
  padding: 1rem !important;
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

.gib-bg {
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(16px) saturate(120%);

  width: fit-content;
  block-size: fit-content;
}


.context-spawn {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  display: flex;
  flex-direction: row;
  align-content: center;
  align-items: center;
  // width: 100%;
  // height: 100%;

  padding: 2rem;

  color: #fff;

  // .context-item {
  //   font-size: .95rem;
  //   padding: 1rem 1.6rem;
  //   background-color: rgba(0, 0, 0, 0.5);
  //   backdrop-filter: blur(16px) saturate(120%);

  //   white-space: nowrap;
  // }

  // .spawn-container {
    // border: 1px solid white;
  // }
}

</style>
