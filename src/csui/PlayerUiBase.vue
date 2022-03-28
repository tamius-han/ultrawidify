<template>
  <div class="uw-hover uv-hover-trigger-region uw-clickable">
    TEST CONTENT
  </div>
  <div class="popup-panel flex flex-column uw-clickable">
    <div class="popup-window-header">
      <div class="popup-title">Ultrawidify <small>{{settings?.active?.version}} - {{BrowserDetect.processEnvChannel}}</small></div>
      <div class="site-support-info">
        <div class="site-support-site">{{site}}</div>
        <div v-if="siteSupportLevel === 'official'" class="site-support official">
          <mdicon name="check-decagram" />
          <div>Official</div>
          <div class="tooltip">The extension is being tested and should work on this site.</div>
        </div>
        <div v-if="siteSupportLevel === 'community'" class="site-support community">
          <mdicon name="handshake" />
          <div>Community</div>
          <div class="tooltip">
            People say extension works on this site (or have provided help getting the extension to work if it didn't).<br/><br/>
            Tamius (the dev) does not test the extension on this site, probably because it requires a subscription or
            is geoblocked.
          </div>
        </div>
        <div v-if="siteSupportLevel === 'no-support'" class="site-support no-support">
          <mdicon name="help-circle-outline" />
          <span class="mdi help-circle-outline mdi-help-circle-outline"></span>
          <div>Unknown</div>
          <div class="tooltip">
            Not officially supported. Extension will try to fix things, but no promises.<br/><br/>
            Tamius (the dev) does not test the extension on this site for various reasons
            (unaware, not using the site, language barrier, geoblocking, requires paid subscription).
          </div>
        </div>
        <div v-if="siteSupportLevel === 'user-added'" class="site-support user-added">
          <!-- <mdicon name="account" /> -->
          <span class="mdi account-edit mdi-account-edit"></span>
          <div>Custom</div>
          <div class="tooltip">
            You have manually changed settings for this site. The extension is doing what you told it to do.
          </div>
        </div>
        <mdicon v-if="siteSupportLevel === 'community'" class="site-support supported" name="checkbox-marked-circle" />
      </div>
    </div>
    <div class="flex flex-row">
      <div class="tab-row flex flex-column">
        <div
          v-for="tab of tabs"
          :key="tab.id"
          class="tab"
          :class="{'active': tab.id === selectedTab}"
          @click="selectTab(tab.id)"
        >
          <div class="icon-container">
            <mdicon
              :name="tab.icon"
              :size="48"
            />
          </div>
          <div class="label">
            {{tab.label}}
          </div>
        </div>
      </div>
      <div class="content flex flex-column">
        <!-- autodetection warning -->

        <div v-if="ultrawidify?.videoData?.hasDrm" class="warning-area">
          <div class="warning-box">
            <div>
              <mdicon name="alert" :size="42" />
            </div>
            <div>
              This site uses <a href="https://en.wikipedia.org/wiki/Digital_rights_management" target="_blank">digital rights management</a> solutions that prevent this
              extension from automatically detecting aspect ratio. You will have to adjust aspect ratio manually.
            </div>
          </div>
        </div>

        <div class="flex flex-row">
          <!-- Panel section -->
          <template v-if="settingsInitialized">
            <VideoSettings
              :settings="settings"
              :eventBus="eventBus"
              :site="site"
            ></VideoSettings>
            <!-- <ResizerDebugPanel :debugData="debugData">
            </ResizerDebugPanel> -->
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import VideoSettings from './src/PlayerUiPanels/VideoSettings.vue'
import { mapState } from 'vuex';
// import Icon from '../common/components/Icon';
import ResizerDebugPanel from './src/PlayerUiPanels/ResizerDebugPanelComponent';
import BrowserDetect from '../ext/conf/BrowserDetect';
import ExecAction from './src/ui-libs/ExecAction';
import Logger from '../ext/lib/Logger';
import Settings from '../ext/lib/Settings';
import EventBus from '../ext/lib/EventBus';

export default {
  components: {
    // Icon,
    ResizerDebugPanel, VideoSettings
  },
  data() {
    return {
      // component properties
      settings: {},
      BrowserDetect: BrowserDetect,
      settingsInitialized: false,
      execAction: new ExecAction(),
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

      tabs: [
        {id: 'videoSettings', label: 'Video settings', icon: 'crop'},
        {id: 'playerDetection', label: 'Player detection', icon: ''},
        {id: 'autodetectionSettings', label: 'Autodetection options', icon: ''},
        {id: 'advancedOptions', label: 'Advanced options', icon: 'cogs' },
        {id: 'debugging', label: 'Debugging', icon: 'bug-outline' }
      ],
      selectedTab: 'videoSettings',
    };
  },
  computed: {
    // we don't have vuex here at the moment, so no mapState yet!
    // ...mapState([
    //   'showUi',
    //   'resizerDebugData',
    //   'playerDebugData'
    // ]),
    // LPT: NO ARROW FUNCTIONS IN COMPUTED,
    // IS SUPER HARAM
    // THINGS WILL NOT WORK IF YOU USE ARROWS
    windowWidth() {
      return window.innerWidth;
    },
    windowHeight() {
      return window.innerHeight;
    },
    siteSupportLevel() {
      // console.warn('\n\n\n\n\n\n\n\n\n\n\nsite support level. site:', this, this?.site, this?.settings, this?.settings?.active?.sites[this.site]);
      return (this.site && this.settings?.active) ? this.settings.active.sites[this.site]?.type || 'no-support' : 'waiting';
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
    await this.logger.init({
        allowLogging: true,
    });

    this.settings = new Settings({afterSettingsSaved: this.updateConfig, logger: this.logger});
    await this.settings.init();
    this.settingsInitialized = true;

    // set up communication with client script
    window.addEventListener('message', event => {
      this.handleMessage(event);
    });

    /**
     * Setup the "companion" onMouseMove handler to the one in the content script.
     * We can handle events with the same function we use to handle events from
     * the content script.
     */
    document.addEventListener('mousemove', (event) => {
      this.handleProbe({
        coords: {
          x: event.clientX,
          y: event.clientY
        }
      }, this.origin);
    });
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
        this.handleProbe(event.data, event.origin);
      } else if (event.data.action === 'uw-bus-tunnel') {
        this.handleBusTunnelIn(event.data.payload);
      }
    },

    /**
     * Handles 'uwui-probe' events. It checks whether there's a clickable element under
     * cursor, and sends a reply to the content scripts that indicates whether pointer-events
     * property of the iframe should be set to capture or ignore the clicks.
     */
    handleProbe(eventData, origin) {
      if (eventData.ts < this.lastProbeTs) {
        return; // i don't know if events can arrive out-of-order. Prolly not. We still check.
      }
      this.lastProbeTs = eventData.ts;

      /* we check if our mouse is hovering over an element.
       *
       * gentleman's agreement: elements with uw-clickable inside the iframe will
       * toggle pointerEvents on the iframe from 'none' to 'auto'
       * Children of uw-clickable events should also do that.
       *
       * TODO: rename uw-clickable to something else, since we pretty much need that on
       * our top-level element.
       */
      let isClickable = false;
      let element = document.elementFromPoint(eventData.coords.x, eventData.coords.y);

      while (element) {
        if (element?.classList.contains('uw-clickable')) {
          // we could set 'pointerEvents' here and now & simply use return, but that
          // might cause us a problem if we ever try to add more shit to this function
          isClickable = true;
          break;
        }
        element = element.parentElement;
      }

      window.parent.postMessage(
        {
          action: 'uwui-clickable',
          clickable: isClickable,
          ts: +new Date()
        },
        origin
      );
    },

    handleBusTunnelIn(payload) {
      this.eventBus.send(payload.action, payload.config);
    },

    selectTab(tab) {
      console.log('selected tab:', tab);
      console.warn('NOTE: tab selection is not syet inplemented!')
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

// .relative-wrapper {
//   position: relative;
//   width: 100%;
//   height: 100%;
// }

.site-support-info {
  display: flex;
  flex-direction: row;
  align-items: center;

  .site-support-site {
    font-size: 1.5em;
  }

  .site-support {
    display: inline-flex;
    flex-direction: row;
    align-items: center;

    margin-left: 1rem;
    border-radius: 8px;
    padding: 0rem 1.5rem 0rem 1rem;

    position: relative;

    .tooltip {
      padding: 1rem;
      display: none;
      position: absolute;
      bottom: 0;
      transform: translateY(110%);
      width: 42em;

      background-color: rgba(0,0,0,0.90);
      color: #ccc;
    }
    &:hover {
      .tooltip {
        display: block;
      }
    }

    .mdi {
      margin-right: 1rem;
    }

    &.official {
      background-color: #fa6;
      color: #000;

      .mdi {
        fill: #000 !important;
      }
    }

    &.community {
      background-color: rgb(47, 47, 97);
      color: #fff;

      .mdi {
        fill: #fff !important;
      }
    }

    &.no-support {
      background-color: rgb(138, 65, 126);
      color: #eee;

      .mdi {
        fill: #eee !important;
      }
    }

    &.user-added {
      border: 1px solid #ff0;

      color: #ff0;

      .mdi {
        fill: #ff0 !important;
      }
    }
  }
}

.uw-hover {
  position: absolute;
  top: 10%;
  left: 10%;
  width: 100px;
  height: 100px;
  color: #fff;
  background-color: #000;

  z-index: 999999999999999999;
}
.uw-hover:hover {
  background-color: #f00;
}

.popup-panel {
  position: absolute;

  top: 10%;
  left: 10%;

  z-index: 999999999999999999;

  width: 2500px;
  height: 1200px;
  max-width: 80%;
  max-height: 80%;

  pointer-events: all !important;

  background-color: rgba(0,0,0,0.50);
  color: #fff;

  overflow-y: auto;

  backdrop-filter: blur(16px) saturate(120%);

  .popup-window-header {
    padding: 1rem;
    background-color: rgba(5,5,5, 0.75);
  }
  .tab-row {
    background-color: rgba(11,11,11, 0.75);

    .tab {
      display: flex;
      flex-direction: row;
      align-items: center;

      padding: 2rem;
      font-size: 1.5rem;
      height: 4rem;

      border-bottom: 1px solid rgba(128, 128, 128, 0.5);
      border-top: 1px solid rgba(128, 128, 128, 0.5);
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
      &.active {
        opacity: 1.0;
        background-color: $primaryBg;
        color: rgb(255, 174, 107);
        border-bottom: 1px solid rgba(116, 78, 47, 0.5);
        border-top: 1px solid rgba(116, 78, 47, 0.5);
      }

      .icon-container {
        width: 64px;
        flex-grow: 0;
        flex-shrink: 0;
      }
      .label {
        flex-grow: 1;
        flex-shrink: 1;
        padding: 0 !important;
      }
    }
  }

  .popup-title, .popup-title h1 {
    font-size: 48px !important;
  }
}

pre {
  white-space: pre-wrap;
}

</style>
