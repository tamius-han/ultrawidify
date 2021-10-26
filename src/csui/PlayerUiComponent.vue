<template>
  <div class="uw-hover uv-hover-trigger-region">
    TEST CONTENT
  </div>
  <div class="popup-panel flex flex-column">
    <div>
      <div class="popup-title">Ultrawidify <small>{{settings?.active?.version}} - {{BrowserDetect.processEnvChannel}}</small></div>
      <div class="">
        Site: {{site}}
        <div v-if="siteSupportLevel === 'supported'" class="site-support supported">
          <mdicon name="check-decagram" />
          <div>Officially supported</div>
        </div>
        <div v-if="siteSupportLevel === 'community'" class="site-support community">
          <mdicon name="handshake" />
          <div>Supported through contributions from community.</div>
        </div>
        <div v-if="siteSupportLevel === 'community'" class="site-support no-support">
          <mdicon name="help-circle-outline" />
          <div>Not officially supported. Extension will try to fix things, but no promises.</div>
        </div>
        <div v-if="siteSupportLevel === 'user-added'" class="site-support user-added">
          <mdicon name="account" />
          <div>Extension follows your personal configuration for this site.</div>
        </div>
        <mdicon v-if="siteSupportLevel === 'community'" class="site-support supported" name="checkbox-marked-circle" />
      </div>
    </div>
    <div class="flex flex-row">
      <div class="tab-row flex flex-column">
        <div class="tab">
          <mdicon name="crop" />
          Video options
        </div>
        <div class="tab">
          Autodetection options
        </div>
        <div class="tab">
          <mdicon name="cogs" />
          Advanced options
        </div>
        <div class="tab">
          <mdicon name="bug-outline" />
          Debugging
        </div>
      </div>
      <div class="content flex flex-column">
        <!-- autodetection warning -->

        <div class="warning-area">
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
import VideoSettings from './PlayerUiPanels/VideoSettings.vue'
import { mapState } from 'vuex';
// import Icon from '../common/components/Icon';
import ResizerDebugPanel from './PlayerUiPanels/ResizerDebugPanelComponent';
import BrowserDetect from '../ext/conf/BrowserDetect';
import ExecAction from './ui-libs/ExecAction';
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

      uiVisible: true,
      debugData: {
        resizer: {},
        player: {},
      },
      debugDataPrettified: ''
    };
  },
  computed: {
    ...mapState([
      'showUi',
      'resizerDebugData',
      'playerDebugData'
    ]),
    windowWidth: () => {
      return window.innerWidth;
    },
    windowHeight: () => {
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
    try {
      this.logger = new Logger();
      await this.logger.init({
          allowLogging: true,
      });

      this.settings = new Settings({afterSettingsSaved: this.updateConfig, logger: this.logger});
      await this.settings.init();
      this.settingsInitialized = true;

      console.log("settings inited")

      this.execAction.setSettings(this.settings);

      console.log("created!");
      console.log("store:", this.$store, this);

      console.log("settings:", this.settings)
      console.log("windowPD", window.ultrawidify);
      console.log("this:", this);


      console.log('eventBus:', this.eventBus);
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

<style lang="scss" src="../res/css/uwui-base.scss" scoped></style>
<style lang="scss" src="../res/css/flex.scss" scoped></style>
<style lang="scss" src="./res-common/common.scss" scoped></style>
<style lang="scss" scoped>
@import '../res/css/uwui-base.scss';
@import '../res/css/colors.scss';
@import '../res/css/font/overpass.css';
@import '../res/css/font/overpass-mono.css';
@import '../res/css/common.scss';

.uw-ultrawidify-container-root {
  // .relative-wrapper {
  //   position: relative;
  //   width: 100%;
  //   height: 100%;
  // }

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


}


</style>
