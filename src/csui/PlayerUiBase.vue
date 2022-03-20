<template>
  <div class="uw-hover uv-hover-trigger-region uw-clickable">
    TEST CONTENT
  </div>
  <div class="popup-panel flex flex-column uw-clickable">
    <div>
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
          class="tab"
          @click="selectTab('videoSettings')"
        >
          <mdicon name="crop" />
          <span class="mdi account-edit mdi-account-edit"></span>
          Video options
        </div>
        <div
          class="tab"
          @click="selectTab('playerDetection')"
        >
          Player detection
        </div>
        <div
          class="tab"
          @click="selectTab('autodetectionSettings')"
        >
          Autodetection options
        </div>
        <div
          class="tab"
          @click="selectTab('advancedOptions')"
        >
          <mdicon name="cogs" />
          <span class="mdi account-edit mdi-cogs"></span>
          Advanced options
        </div>
        <div class="tab">
          <mdicon name="bug-outline" />
          <span class="mdi mdi-bug-outline"></span>
          Debugging
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
      logger: null,

      // we _should_ be always running from an iframe in order to
      // avoid fucking up CSS. This means rules of the game change
      // a wee tiny bit.
      site: window.parent.location.hostname,
      lastProbeTs: null,

      uiVisible: true,
      debugData: {
        resizer: {},
        player: {},
      },
      debugDataPrettified: ''
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
      console.warn('\n\n\n\n\n\n\n\n\n\n\nsite support level. site:', this, this?.site, this?.settings, this?.settings?.active?.sites[this.site]);
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
    try {
      this.logger = new Logger();
      await this.logger.init({
          allowLogging: true,
      });

      this.settings = new Settings({afterSettingsSaved: this.updateConfig, logger: this.logger});
      await this.settings.init();
      this.settingsInitialized = true;

      console.log("settings inited")
    } catch (e) {
      console.error('Failed to initiate ultrawidify player ui.', e);
    }
  },
  methods: {
    getUrl(url) {
      return BrowserDetect.getURL(url);
    },
  }
}
</script>

<style lang="scss" scoped>

@import 'res/css/uwui-base.scss';
@import 'res/css/colors.scss';
@import 'res/css/font/overpass.css';
@import 'res/css/font/overpass-mono.css';
@import 'res/css/common.scss';

// .relative-wrapper {
//   position: relative;
//   width: 100%;
//   height: 100%;
// }

.site-support-info {
  display: flex;
  flex-direction: row;
  // padding-left: 2rem;

  .site-support-site {
    font-size: 1.2em;
  }

  .site-support {
    display: inline-flex;
    flex-direction: row;
    align-items: center;

    margin-left: 2rem;
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

  .popup-title, .popup-title h1 {
    font-size: 48px !important;
  }

  .tab {
    display: block;
    height: 42px;
    font-size: 2.5rem;
    background: rgb(87, 54, 26);
  }
  .tab:hover {
    background-color: #f00;
  }
}

pre {
  white-space: pre-wrap;
}

</style>
