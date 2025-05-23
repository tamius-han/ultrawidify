<template>
  <div class="flex flex-col tab-root">
    <div class="flex flex-row flex-wrap">

      <!-- AARD performance metrics -->
      <div>
        <div class="flex flex-row">
          <h1>Automatic Aspect Ratio Detection</h1>
        </div>
        <div class="aard-settings-group">

          <!-- the last time i tried to comment out this block, it didn't work properly — v-if="false" it is -->
          <div v-if="false">
            <p>
              <b>Autodetection performance</b>
            </p>
            <p>
              Automatic aspect ratio detection is a resource-hungry feature.
              This page allows you to trade autodetection accuracy and/or frequency for
              better performance.
            </p>
            <p>
              Note that some browsers <a href="https://developer.mozilla.org/en-US/docs/Web/API/Performance/now" target="_blank">limit the accuracy of time measurements</a>, though once the bars go past the blue line those limitations are largely inconsequential.
            </p>
            <div class="performance-graph-container">
              <div class="performance-graph">
                <div class="time-budget hz144"></div>
                <div class="time-budget hz120"></div>
                <div class="time-budget hz60"></div>
                <div class="time-budget hz30"></div>
                <div class="time-budget hz24"></div>
                <div class="time-budget rest"></div>

                <div class="bar-container">
                  <div class="average-case">
                    <div class="stats">
                      <b>Average: </b>
                      <span class="draw">draw (main) {{(performanceData?.imageDraw?.averageTime ?? 0).toFixed(1)}} ms</span> |
                      <span class="draw-blackframe">blackframe {{(performanceData?.blackFrame?.averageTime ?? 0).toFixed(1)}} ms</span> |
                      <span class="processing">
                        processing {{
                          Math.max(
                            (performanceData?.total?.averageTime ?? 0)
                              - (performanceData?.imageDraw?.averageTime ?? 0)
                              - (performanceData?.blackFrame?.averageTime ?? 0),
                            0
                          ).toFixed(1)
                        }} ms
                      </span>
                    </div>
                    <div class="bar">
                      <div
                        class="draw"
                        :style="{'width': (performanceData?.imageDraw?.averageTime ?? 0) + '%'}"
                      >
                      </div>
                      <div
                        class="draw-blackframe"
                        :style="{'width': (performanceData?.blackFrame?.averageTime ?? 0) + '%'}"
                      >
                      </div>
                      <div
                        class="processing"
                        :style="{
                          'width': Math.max(
                            (performanceData?.total?.averageTime ?? 0)
                              - (performanceData?.imageDraw?.averageTime ?? 0)
                              - (performanceData?.blackFrame?.averageTime ?? 0),
                            0
                          ) + '%'
                        }"
                      >
                      </div>
                    </div>
                  </div>
                  <div class="worst-case">
                    <div class="stats">
                      <b>Worst: </b>
                      <span class="draw">draw (main) {{(performanceData?.imageDraw?.worstTime ?? 0).toFixed(1)}} ms</span> |
                      <span class="draw-blackframe">blackframe {{(performanceData?.blackFrame?.worstTime ?? 0).toFixed(1)}} ms</span> |
                      <span class="processing">
                        processing {{
                          Math.max(
                            (performanceData?.total?.worstTime ?? 0)
                              - (performanceData?.imageDraw?.worstTime ?? 0)
                              - (performanceData?.blackFrame?.worstTime ?? 0),
                            0
                          ).toFixed(1)
                        }} ms
                      </span>
                    </div>
                    <div class="bar">
                      <div
                        class="draw"
                        :style="{'width': (performanceData?.imageDraw?.worstTime ?? 0) + '%'}"
                      >
                      </div>
                      <div
                        class="draw-blackframe"
                        :style="{'width': (performanceData?.blackFrame?.worstTime ?? 0) + '%'}"
                      >
                      </div>
                      <div
                        class="processing"
                        :style="{
                          'width': Math.max(
                            (performanceData?.total?.worstTime ?? 0)
                              - (performanceData?.imageDraw?.worstTime ?? 0)
                              - (performanceData?.blackFrame?.worstTime ?? 0),
                            0
                          ) + '%'
                        }"
                      >
                      </div>
                    </div>
                  </div>

                  <div class="average-case">
                    <div class="stats">
                      <b>AR change (average): </b>
                      <span class="draw">draw (main) {{(performanceData?.imageDraw?.averageTime ?? 0).toFixed(1)}} ms</span> |
                      <span class="draw-blackframe">blackframe {{(performanceData?.blackFrame?.averageTime ?? 0).toFixed(1)}} ms</span> |
                      <span class="processing">processing {{
                        (
                          (performanceData?.fastLetterbox?.averageTime ?? 0)
                          + (performanceData?.edgeDetect?.averageTime ?? 0)
                        ).toFixed(1)
                        }} ms</span>
                    </div>
                    <div class="bar">
                      <div
                        class="draw"
                        :style="{'width': (performanceData?.imageDraw?.averageTime ?? 0) + '%'}"
                      >
                      </div>
                      <div
                        class="draw-blackframe"
                        :style="{'width': (performanceData?.blackFrame?.averageTime ?? 0) + '%'}"
                      >
                      </div>
                      <div
                        class="processing"
                        :style="{
                          'width': (
                            (performanceData?.fastLetterbox?.averageTime ?? 0)
                            + (performanceData?.edgeDetect?.averageTime ?? 0)
                          ) + '%'
                        }"
                      >
                      </div>
                    </div>
                  </div>
                  <div class="worst-case">
                    <div class="stats">
                      <b>AR change (worst): </b>
                      <span class="draw">draw (main) {{(performanceData?.imageDraw?.worstTime ?? 0).toFixed(1)}} ms</span> |
                      <span class="draw-blackframe">blackframe {{(performanceData?.blackFrame?.worstTime ?? 0).toFixed(1)}} ms</span> |
                      <span class="processing">processing {{
                        (
                          (performanceData?.fastLetterbox?.worstTime ?? 0)
                          + (performanceData?.edgeDetect?.worstTime ?? 0)
                        ).toFixed(1)
                        }} ms</span>
                    </div>
                    <div class="bar">
                      <div
                        class="draw"
                        :style="{'width': (performanceData?.imageDraw?.worstTime ?? 0) + '%'}"
                      >
                      </div>
                      <div
                        class="draw-blackframe"
                        :style="{'width': (performanceData?.blackFrame?.worstTime ?? 0) + '%'}"
                      >
                      </div>
                      <div
                        class="processing"
                        :style="{
                          'width': (
                            (performanceData?.fastLetterbox?.worstTime ?? 0)
                            + (performanceData?.edgeDetect?.worstTime ?? 0)
                          ) + '%'
                        }"
                      >
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>


          <div class="settings-segment">
            <!-- <h2>Basic settings</h2> -->

            <!-- <div class="field">
              <div class="label">
                Stop autodetection after first detection:
              </div>
              <div class="">
                <input type="checkbox" v-model="settings.active.arDetect.earlyStopOptions.stopAfterFirstDetection" />
              </div>
            </div>
            <div class="field">
              <div class="label">
                Stop detection after a period of time:
              </div>
              <div class="">
                <input type="checkbox" v-model="settings.active.arDetect.earlyStopOptions.stopAfterTimeout" />
              </div>
            </div>
            <div class="field">
              <div class="label">
                Stop detection after:
              </div>
              <div class="input">
                <input type="input" v-model="settings.active.arDetect.earlyStopOptions.stopTimeout" />
                <div class="unit">seconds</div>
              </div>
            </div> -->

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
              <div class="label">Frame extraction canvas type:</div>
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
              <div class="hint">
                Ultrawidify detects letterbox only if video is vertically centered. Some people are bad at vertically
                centering the content, though. This is how off-center the video can be before autodetection will
                refuse to crop it (% of total height).
              </div>
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
    this.graphRefreshInterval = setInterval(() => this.eventBus.sendToTunnel('get-aard-timing'), 500);
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
    setArCheckFrequency(event) {
      this.settings.active.arDetect.timers.playing = Math.floor(Math.pow(Math.E, event));
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
