<template>
  <div class="flex flex-col tab-root">
    <div class="flex flex-row flex-wrap">

      <!-- AARD performance metrics -->
      <div>
        <div class="flex flex-row">
          <h1>Automatic Aspect Ratio Detection</h1>
        </div>
        <div class="aard-settings-group">

          <div class="settings-segment">

            <div class="field">
              <div class="label">Autodetection frequency (time between samples)</div>
              <div class="range-input">
                <input
                  type="range"
                  :value="Math.log(settings.active.arDetect.timers.playing)"
                  @change="setArCheckFrequency($event.target.value)"
                  min="2.3"
                  max="9.3"
                  step="0.01"
                />
                <input
                  v-model="settings.active.arDetect.timers.playing"
                  @change="setArCheckFrequency($event.target.value)"
                  class="input"
                  type="text"
                >
                <div class="unit">ms</div>
              </div>
            </div>

            <div class="field">
              <div class="label">Reduced autodetection frequency</div>
              <div class="range-input">
                <input
                  type="range"
                  :value="Math.log(settings.active.arDetect.timers.playingReduced)"
                  @change="setArCheckFrequency($event.target.value, 'playingReduced')"
                  min="2.3"
                  max="9.3"
                  step="0.01"
                />
                <input
                  v-model="settings.active.arDetect.timers.playingReduced"
                  @change="setArCheckFrequency($event.target.value, 'playingReduced')"
                  class="input"
                  type="text"
                >
                <div class="unit">ms</div>
              </div>
            </div>

            <div class="field">
              <div class="label">Poll for aspect ratio changes in background tabs:</div>
              <div class="select">
                <select v-model="settings.active.arDetect.polling.runInBackgroundTabs" @change="settings.saveWithoutReload">
                  <option :value="AardPollingOptions.No">Never</option>
                  <option :value="AardPollingOptions.Reduced">Use reduced polling rate</option>
                  <option :value="AardPollingOptions.Full">Use normal polling rate</option>
                </select>
              </div>
            </div>
            <div v-if="settings.active.arDetect.polling.runInBackgroundTabs === AardPollingOptions.Full" class="hint warn">
              Using normal polling rate in background tabs is NOT recommended.
            </div>

            <div class="field">
              <div class="label">Poll for aspect ratio changes in small players:</div>
              <div class="select">
                <select v-model="settings.active.arDetect.polling.runOnSmallVideos" @change="settings.saveWithoutReload">
                  <option :value="AardPollingOptions.No">Never</option>
                  <option :value="AardPollingOptions.Reduced">Use reduced polling rate</option>
                  <option :value="AardPollingOptions.Full">Use normal polling rate</option>
                </select>
              </div>
            </div>
            <div v-if="settings.active.arDetect.polling.runOnSmallVideos === AardPollingOptions.Full" class="hint warn">
              Using normal polling rate on small videos is NOT recommended.
            </div>

            <div class="field">
              <div class="label">Stop autodetection after first detection:</div>
              <div class="select">
                <select v-model="settings.active.arDetect.autoDisable.onFirstChange" @change="settings.saveWithoutReload">
                  <option :value="true">Yes</option>
                  <option :value="false">No</option>
                </select>
              </div>
            </div>

            <div class="field" :class="{disabled: settings.active.arDetect.autoDisable.onFirstChange}">
              <div class="label">Stop autodetection if aspect ratio doesn't change for some time:</div>
              <div class="select">
                <select v-model="settings.active.arDetect.autoDisable.ifNotChanged" @change="settings.saveWithoutReload">
                  <option :value="true">Yes</option>
                  <option :value="false">No</option>
                </select>
              </div>
            </div>

            <div v-if="settings.active.arDetect.autoDisable.ifNotChanged" class="field">
              <div class="label">Stop autodetection if aspect ratio doesn't change for:</div>
              <div class="range-input">
                <input
                  type="range"
                  :value="Math.log(settings.active.arDetect.autoDisable.ifNotChangedTimeout / 10)"
                  @change="setAutoDisableTimeout($event.target.value, 10)"
                  min="2.3"
                  max="9.3"
                  step="0.01"
                />
                <input
                  :value="settings.active.arDetect.autoDisable.ifNotChangedTimeout / 1000"
                  @change="setAutoDisableTimeout($event.target.value, 1000)"
                  class="input"
                  type="text"
                >
                <div class="unit">s</div>
              </div>
            </div>

            <div class="field">
              <div class="label">Autodetection canvas type:</div>
              <div class="select">
                <select v-model="settings.active.arDetect.aardType" @change="settings.saveWithoutReload">
                  <option value="auto">Automatic</option>
                  <option value="webgl">WebGL only</option>
                  <option value="legacy">Legacy / fallback</option>
                </select>
              </div>
            </div>

            <div class="field">
              <div class="label">Maximum allowed vertical video misalignment:</div>
              <div class="input">
                <input v-model="settings.active.arDetect.allowedMisaligned" />
              </div>
            </div>
            <div class="hint">
              Ultrawidify detects letterbox only if video is vertically centered. Some people are bad at vertically
              centering the content, though. This is how off-center the video can be before autodetection will
              refuse to crop it (% of total height).
            </div>
          </div>

          <div v-if="settings.active.ui.devMode" class="settings-segment">
            <p>
              <b>Debug options</b>
            </p>
            <div class="flex flex-row">
              <div>
                <div>
                  <button @click="eventBus.sendToTunnel('aard-enable-debug', true)">Show debug overlay</button>
                </div>
                <div>
                  <div class="label">Show debug overlay on startup</div>
                  <input
                    type="checkbox"
                    v-model="settings.active.ui.dev.aardDebugOverlay.showOnStartup"
                    @change="settings.saveWithoutReload"
                  >
                </div>
              </div>
              <div>
                <JsonEditor
                  v-model="settingsJson"
                >
                </JsonEditor>
                <button @click="saveDebugUiSettings">Save debug UI settings</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Button from '../components/Button.vue'
import KeyboardShortcutParser from '../../../common/js/KeyboardShortcutParser';
import ShortcutButton from '../components/ShortcutButton';
import EditShortcutButton from '../components/EditShortcutButton';
import BrowserDetect from '../../../ext/conf/BrowserDetect';
import AspectRatioType from '../../../common/enums/AspectRatioType.enum';
import StretchType from '../../../common/enums/StretchType.enum';
import CropModePersistence from '../../../common/enums/CropModePersistence.enum';
import AlignmentOptionsControlComponent from './AlignmentOptionsControlComponent.vue';
import JsonEditor from '@csui/src/components/JsonEditor';
import {AardPollingOptions} from '@src/ext/lib/aard/enums/aard-polling-options.enum';

export default {
  components: {
    ShortcutButton,
    EditShortcutButton,
    Button,
    AlignmentOptionsControlComponent,
    JsonEditor
  },
  mixins: [
  ],
  props: [
    'settings',
    'frame',
    'eventBus',
    'site'
  ],
  data() {
    return {
      exec: null,
      performanceData: {},
      graphRefreshInterval: undefined,
      settingsJson: {},

      // enums n stuff
      AardPollingOptions,
    }
  },
  computed: {
  },
  created() {
    this.eventBus.subscribe(
      'uw-config-broadcast',
      {
        source: this,
        function: (config) => this.handleConfigBroadcast(config)
      }
    );
  },
  mounted() {
    this.eventBus.sendToTunnel('get-aard-timing');
    // this.graphRefreshInterval = setInterval(() => this.eventBus.sendToTunnel('get-aard-timing'), 500);
    this.resetSettingsEditor();
  },
  destroyed() {
    this.eventBus.unsubscribeAll(this);
    clearInterval(this.graphRefreshInterval);
  },
  methods: {
    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },
    setArCheckFrequency(event, timer) {
      this.settings.active.arDetect.timers[timer ?? 'playing'] = Math.floor(Math.pow(Math.E, event));
      this.settings.saveWithoutReload();
    },
    setAutoDisableTimeout(event, multiplier) {
      this.settings.active.arDetect.autoDisable.ifNotChangedTimeout = Math.floor(Math.pow(Math.E, event)) * multiplier;
      this.settings.saveWithoutReload();
    },
    refreshGraph() {
       this.eventBus.sendToTunnel('get-aard-timing');
    },
    handleConfigBroadcast(data) {
      if (data.type === 'aard-performance-data') {
        this.performanceData = data.performanceData;
        this.$nextTick( () => this.$forceUpdate() );
      }
    },
    resetSettingsEditor() {
      this.settingsJson = JSON.parse(JSON.stringify(this.settings?.active.ui.dev.aardDebugOverlay ?? {}));
    },
    saveDebugUiSettings() {
      this.settings.active.ui.dev.aardDebugOverlay = JSON.parse(JSON.stringify(this.settingsJson));
      this.settings.saveWithoutReload();
    }
  },

}
</script>

<style lang="scss" src="../../res/css/flex.scss" scoped module></style>
<style lang="scss" src="@csui/src/res-common/panels.scss" scoped module></style>
<style lang="scss" src="@csui/src/res-common/common.scss" scoped module></style>

<style lang="scss" scoped module>
@import '../res-common/variables';

// .aard-settings-group {
//   max-width: 69rem;
// }

.performance-graph-container {
  position: relative;

  width: 100%;
  height: 8rem;
  padding: 1rem;

  .performance-graph {
    border: 1px solid #fa6;

    position: absolute;
    left: 0;
    top: 0;

    width: 100%;
    height: 100%;

    // graph is 100 ms wide
    .time-budget {
      height: 100%;
      display: inline-block;
      position: relative;

      box-sizing: border-box;

      z-index: 100;

      &.hz144 {
        width: 6.9%;
        // background-color: rgba(143, 143, 235, 0.47);
      }
      &.hz120 {
        width: 1.39%;
        // background-color: rgba(108, 108, 211, 0.441);
      }
      &.hz60 {
        width: 8.33%;
        // background-color: rgba(78, 78, 182, 0.327);
        border-right: 2px solid rgb(96, 96, 227);
        &::after {
          content: '60fps';
          position: absolute;
          top: 0;
          right: -2px;

          border-right: 2px solid rgb(96, 96, 227);

          transform: translateY(-100%);

          font-size: 0.6rem;
          padding-right: 0.25rem;
          text-transform: small-caps;
        }
      }
      &.hz30 {
        width: 16.67%;
        // background-color: rgba(56, 56, 151, 0.308);
        border-right: 2px solid #fb772a;

        &::after {
          content: '30fps';
          position: absolute;
          top: 0;
          right: -2px;

          border-right: 2px solid #fb772a;

          transform: translateY(-100%);

          font-size: 0.6rem;
          padding-right: 0.25rem;
          text-transform: small-caps;
        }
      }
      &.hz24 {
        width: 8.33%;
        // background-color: rgba(37, 37, 118, 0.269);
      }
    }


    .bar-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;

      > div {
        height: 2.5rem;
      }

      .stats {
        background-color: rgba(0, 0, 0, 0.544);
        font-size: 0.75rem;
        font-family: 'Overpass Mono';
        z-index: 11010;

        span {
          font-size: 0.75rem;
          z-index: 11011;

          &::before {
            content: '';
            display: inline-block;
            width: 0.75rem;
            height: 0.75rem;
            margin-top: 0.25rem;
            margin-right: 0.5rem;
          }

          &.draw::before {
            background-color: #fb772a;
          }
          &.draw-blackframe::before {
            background-color: #e70c0c;
          }
          &.processing::before {
            background-color: rgb(176, 167, 239);
          }
        }
      }

      .bar {
        width: 100%;
        height: 0.69rem;
        background-color: #000;

        overflow: hidden;
        * {
          display: inline-block;
          height: 100%;
        }

        .draw {
          background-color: #fb772a;
        }
        .draw-blackframe {
          background-color: #e70c0c;
        }
        .processing {
          background-color: rgb(176, 167, 239);
        }
      }
    }
  }
}
</style>
