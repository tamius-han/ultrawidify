<template>
  <div class="uw-hover uv-hover-trigger-region">
    TEST CONTENT
  </div>
  <div class="popup-panel flex flex-row">
    <div class="tab-row flex flex-column">
      <div class="tab">
        todo: icon<br/>
        Video options
      </div>
      <div class="tab">
        Autodetection options
      </div>
      <div class="tab">
        Advanced options
      </div>
      <div class="tab">
        Debugging
      </div>
    </div>
    <div>
      <!-- Panel section -->
      <template v-if="settingsInitialized">
        <VideoSettings
          :settings="settings"
        ></VideoSettings>
        <ResizerDebugPanel :debugData="debugData">
        </ResizerDebugPanel>
      </template>
    </div>
  </div>
</template>

<script>
import VideoSettings from './PlayerUiPanels/VideoSettings.vue'
import { mapState } from 'vuex';
import Icon from '../common/components/Icon';
import ResizerDebugPanel from './PlayerUiPanels/ResizerDebugPanelComponent';
import BrowserDetect from '../ext/conf/BrowserDetect';
import ExecAction from './ui-libs/ExecAction';
import Logger from '../ext/lib/Logger';
import Settings from '../ext/lib/Settings';

export default {
  components: {
    Icon,
    ResizerDebugPanel, VideoSettings
  },
  data() {
    return {
      // component properties
      settings: {},
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

    background-color: rgba(0,0,0,0.69);
    color: #fff;

    overflow-y: auto;

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
