<template>
  <div
    class="context-spawn uw-ui-area"
    style="z-index: 1000;"
    v-if="!triggerZoneEditorVisible"
  >
    <div
      class="spawn-container uw-ui-trigger"
      :style="triggerZoneStyles"
    >
      &nbsp;
    </div>
  </div>

  <div
    v-if="contextMenuActive || settingsInitialized && uwTriggerZoneVisible && !isGlobal"
    class="context-spawn uw-ui-area"
    style="z-index: 1001"

  >
    <GhettoContextMenu
      alignment="right" class="uw-menu"
      @mouseenter="() => {preventContextMenuHide(); newFeatureViewUpdate('uw6.ui-popup')}"
      @mouseleave="allowContextMenuHide()"
    >
      <template v-slot:activator>
        <div class="context-item uw-clickable">
          Ultrawidify
        </div>
        </template>
      <slot>
        <!--
          Didn't manage to ensure that extension status pops up above other menu items in less than 3 minutes with z-index,
          so wrapping 'status' and 'real menu items' in two different divs, ordering them in the opposite way, and then
          ensuring correct ordering with flex-direction: column-reverse ended up being easier and faster.
        -->
        <div class="uw-clickable menu-width flex-reverse-order">
          <div style="z-index: 1000">
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
              <span style="color: #fa6;">Change when and if<br/>this popup appears</span>
              <span style="font-size: 0.8rem">
                <span style="font-size: 0.8rem; opacity: 0.5">This menu option will show {{settings.active.newFeatureTracker?.['uw6.ui-popup']?.show}} more<br/> times; or until clicked or dismissed.<br/>
                Also accessible via:<br/> <span style="font-size: 0.85em">EXTENSION SETTINGS > UI AND KEYBOARD</span>.
                </span>
                <br/>
                <a style="color: #fa6; cursor: pointer;" @click="() => acknowledgeNewFeature('uw6.ui-popup')">Dismiss this option</a>
              </span>
            </GhettoContextMenuOption>

            <!--  -->
            <GhettoContextMenuOption
              @click="showUwWindow()"
              label="Extension settings"
            >
            </GhettoContextMenuOption>
            <GhettoContextMenuOption
              @click="showUwWindow('playerDetection')"
              label="Incorrect cropping?"
            >
            </GhettoContextMenuOption>
            <GhettoContextMenuOption
              @click="showUwWindow('about')"
              label="Not working?"
            >
            </GhettoContextMenuOption>
          </div>

          <div style="z-index: 10000">
            <GhettoContextMenuItem
              class="extension-status-messages"
              :disableHover="true"
            >
              Site compatibility:
              <SupportLevelIndicator
                :siteSupportLevel="siteSupportLevel"
              >
              </SupportLevelIndicator>
              <div v-if="statusFlags.hasDrm" class="aard-blocked">
                Autodetection potentially<br/>
                unavailable due to <a href="https://en.wikipedia.org/wiki/Digital_rights_management">DRM</a>.
              </div>
              <div v-else-if="statusFlags.aardErrors?.cors" class="aard-blocked">
                Autodetection blocked<br/>
                by site/browser (CORS).
              </div>
              <div v-else-if="statusFlags.aardErrors?.webglError" class="aard-blocked">
                Autodetection unavailable<br/>
                due to webgl error.
              </div>
            </GhettoContextMenuItem>
          </div>
        </div>
      </slot>
    </GhettoContextMenu>
  </div>

  <div
    v-if="settingsInitialized && uwWindowVisible"
    class="uw-window flex flex-col uw-clickable uw-ui-area"
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

  <div
    v-if="triggerZoneEditorVisible"
    class="context-spawn uw-ui-area"
    style="z-index: 1000;"
  >
    <TriggerZoneEditor
      :settings="settings"
      :eventBus="eventBus"
      :playerDimensions="playerDimensions"
    >
    </TriggerZoneEditor>
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
import SupportLevelIndicator from './src/components/SupportLevelIndicator.vue';
import TriggerZoneEditor from './src/components/TriggerZoneEditor.vue';

export default {
  components: {
    PlayerUIWindow,
    GhettoContextMenu,
    GhettoContextMenuItem,
    GhettoContextMenuOption,
    AlignmentOptionsControlComponent,
    SupportLevelIndicator,
    TriggerZoneEditor,
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
      triggerZoneEditorVisible: false,

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
        aardErrors: undefined,
      },
      defaultWindowTab: 'videoSettings',

      saveState: {},
      siteSettings: undefined,
      previewZoneVisible: false,
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
    // LPT: NO ARROW FUNCTIONS IN COMPUTED,
    // IS SUPER HARAM
    // THINGS WILL NOT WORK IF YOU USE ARROWS
    siteSupportLevel() {
      return (this.site && this.siteSettings) ? this.siteSettings.data.type || 'no-support' : 'waiting';
    }
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
    this.settings.listenAfterChange(() => this.updateTriggerZones());

    await this.settings.init();
    this.settingsInitialized = true;

    // set up communication with client script.
    // NOTE: companion onmousemove is set up in UIProbeMixin
    window.addEventListener('message', event => {
      this.handleMessage(event);
    });

    this.eventBus.subscribeMulti(
      {
        'uw-config-broadcast': {
          function:
            (data) => {
              switch (data.type) {
                case 'drm-status':
                  this.statusFlags.hasDrm = data.hasDrm;
                  break;
                case 'aard-error':
                  this.statusFlags.aardErrors = data.aardErrors;
                  break;
                case 'player-dimensions':
                  this.playerDimensionsUpdate(data.data);
                  break;
              }
            }
        },
        'uw-set-ui-state': {
          function: (data) => {
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
          }
        },
        'uw-restore-ui-state': {
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
        },
        'uw-restore-ui-state': {
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
        },
        'ui-trigger-zone-update': {
          function: (data) => {
            this.showTriggerZonePreview = data.previewZoneVisible;
            // this.;
          }
        },
        'start-trigger-zone-edit': {
          function: () => {
            this.triggerZoneEditorVisible = true;
            this.uwWindowVisible = false;
          }
        },
        'finish-trigger-zone-edit': {
          function: () => {
            this.triggerZoneEditorVisible = false;
            this.showUwWindow('playerUiSettings');
          }
        },
      },
      this
    );

    this.sendToParentLowLevel('uwui-get-role', null);
    this.sendToParentLowLevel('uwui-get-theme', null);

    // console.log('player overlay created — get player dims:')
    this.sendToParentLowLevel('uw-bus-tunnel', {
      action: 'get-player-dimensions'
    });
  },

  destroyed() {
    this.eventBus.unsubscribeAll(this)
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
            this.siteSettings = this.settings.getSiteSettings(this.site);
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

<style lang="scss" src="./src/res-common/panels.scss" scoped module></style>
<style lang="scss" src="./src/res-common/common.scss" scoped module></style>

<style lang="scss" scoped>

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
  position: fixed;

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
  top: 0;
  left: 0;

  width: 100dvw;
  height: 100dvh;

  box-sizing: border-box;
  overflow: hidden;

  display: flex;
  flex-direction: row;
  align-content: center;
  align-items: center;
  // width: 100%;
  // height: 100%;

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

.extension-status-messages {
  z-index: 1000;
  text-transform: uppercase;
  display: flex;
  flex-direction: column;
  text-align: center;

  width: 112.25%;
  transform: translate(-12.5%, 12.5%) scale(0.75);

  > * {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }
}

.flex-reverse-order {
  display: flex;
  flex-direction: column-reverse;

}

.aard-blocked {
  color: #fa6;
}

.trigger-zone-preview {
  border: 4px solid #fa4;
}

.debug-1 {
  border: 1px solid yellow;

  &:hover {
    background-color: rbba(255,255,0,0.5);
  }
}
.debug-2 {
  border: 1px solid blue;

  &:hover {
    background-color: rbba(0,0,255,.5);
  }
}
</style>
