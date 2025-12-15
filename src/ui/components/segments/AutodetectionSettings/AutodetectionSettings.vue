<template>
  <div class="flex flex-col relative w-full">
    <h2 class="text-[1.75em]">Automatic Aspect Ratio Detection</h2>
    <p class="text-stone-500">Ultrawidify can attempt to automatically detect aspect ratio of videos playing on the page.</p>
    <p class="text-stone-500">However, autodetection will not work on every website, as some websites make it impossible for autodetection to work.</p>

    <div class="settings-segment">
      <h3 class="text-primary-300 text-[1.25em] mt-4 border-b-1 border-b-stone-700">Early stop</h3>
      <div class="field">
        <div class="label">Stop autodetection after first detection:</div>
        <div class="select">
          <select v-model="aardSettings.autoDisable.onFirstChange" @change="settings.saveWithoutReload">
            <option :value="true">Yes</option>
            <option :value="false">No</option>
          </select>
        </div>
      </div>

      <div class="field" :class="{disabled: aardSettings.autoDisable.onFirstChange}">
        <div class="label">Stop autodetection if aspect ratio doesn't change for some time:</div>
        <div class="select">
          <select v-model="aardSettings.autoDisable.ifNotChanged" @change="settings.saveWithoutReload">
            <option :value="true">Yes</option>
            <option :value="false">No</option>
          </select>
        </div>
      </div>

      <div v-if="aardSettings.autoDisable.ifNotChanged" class="field">
        <div class="label">Stop autodetection if aspect ratio doesn't change for:</div>
        <div class="range-input">
          <input
            type="range"
            :value="Math.log(aardSettings.autoDisable.ifNotChangedTimeout / 10)"
            @change="setAutoDisableTimeout($event.target.value, 10)"
            min="2.3"
            max="9.3"
            step="0.01"
          />
          <input
            :value="aardSettings.autoDisable.ifNotChangedTimeout / 1000"
            @change="setAutoDisableTimeout($event.target.value, 1000)"
            class="input"
            type="text"
          >
          <div class="unit">s</div>
        </div>
      </div>
    </div>

    <div class="settings-segment">
      <h3 class="text-primary-300 text-[1.25em] mt-4 border-b-1 border-b-stone-700">Subtitle handling</h3>
      <div class="warning-area">
        Subtitle detection is experimental to high heaven.
      </div>

      <div class="field">
        <div class="label">Autodetection mode (requires page reload)</div>
        <div class="select">
          <select v-model="settings.active.aard.useLegacy" @change="aardLegacyModeChanged">
            <option :value="true">Legacy</option>
            <option :value="false">Experimental</option>
          </select>
        </div>
      </div>

      <div class="field">
        <div class="label">Subtitle handling strategy:</div>
        <div class="select">
          <select v-model="aardSettings.subtitles.subtitleCropMode" @change="settings.saveWithoutReload">
            <!-- <option :value="AardSubtitleCropMode.DisableScan">Do not detect subtitles</option> -->
            <option :value="AardSubtitleCropMode.ResetAR">Do not crop while subtitles are on screen</option>
            <option :value="AardSubtitleCropMode.ResetAndDisable">Stop autodetection if subtitles are detected</option>
            <option :value="AardSubtitleCropMode.CropSubtitles">Always crop subtitles</option>
          </select>
        </div>
      </div>

      <div v-if="aardSettings.subtitles.subtitleCropMode === AardSubtitleCropMode.ResetAR" class="field">
        <div class="label">Wait before resuming detection:</div>
        <div class="range-input">
          <input
            type="range"
            :value="Math.log(aardSettings.subtitles.resumeAfter / 10)"
            @change="setSubtitleTimeout($event.target.value, 10)"
            min="2.3"
            max="9.3"
            step="0.01"
          />
          <input
            :value="aardSettings.subtitles.resumeAfter / 1000"
            @change="setSubtitleTimeout($event.target.value, 1000)"
            class="input"
            type="text"
          >
          <div class="unit">s</div>
        </div>
      </div>
    </div>

    <div class="settings-segment">
      <h3 class="text-primary-300 text-[1.25em] mt-4 border-b-1 border-b-stone-700">Detection tolerances</h3>
      <div class="field">
        <div class="label">Maximum allowed vertical video misalignment:</div>
        <div class="input">
          <input v-model="aardSettings.allowedMisaligned" />
        </div>
        <div class="hint">
          Ultrawidify detects letterbox only if video is vertically centered. Some people are bad at vertically
          centering the content, though. This is how off-center the video can be before autodetection will
          refuse to crop it (% of total height).
        </div>
      </div>
    </div>

    <!-- AARD performance metrics -->
    <div class="settings-segment">
      <h3 class="text-primary-300 text-[1.25em] mt-4 border-b-1 border-b-stone-700">Performance options</h3>

      <div class="field">
        <div class="label">Autodetection frequency (time between samples)</div>
        <div class="range-input">
          <input
            type="range"
            :value="Math.log(aardSettings.timers.playing)"
            @change="setArCheckFrequency($event.target.value)"
            min="2.3"
            max="9.3"
            step="0.01"
          />
          <input
            v-model="aardSettings.timers.playing"
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
            :value="Math.log(aardSettings.timers.playingReduced)"
            @change="setArCheckFrequency($event.target.value, 'playingReduced')"
            min="2.3"
            max="9.3"
            step="0.01"
          />
          <input
            v-model="aardSettings.timers.playingReduced"
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
          <select v-model="aardSettings.polling.runInBackgroundTabs" @change="settings.saveWithoutReload">
            <option :value="AardPollingOptions.No">Never</option>
            <option :value="AardPollingOptions.Reduced">Use reduced polling rate</option>
            <option :value="AardPollingOptions.Full">Use normal polling rate</option>
          </select>
        </div>
      </div>
      <div v-if="aardSettings.polling.runInBackgroundTabs === AardPollingOptions.Full" class="hint warn">
        Using normal polling rate in background tabs is NOT recommended.
      </div>

      <div class="field">
        <div class="label">Poll for aspect ratio changes in small players:</div>
        <div class="select">
          <select v-model="aardSettings.polling.runOnSmallVideos" @change="settings.saveWithoutReload">
            <option :value="AardPollingOptions.No">Never</option>
            <option :value="AardPollingOptions.Reduced">Use reduced polling rate</option>
            <option :value="AardPollingOptions.Full">Use normal polling rate</option>
          </select>
        </div>
      </div>
      <div v-if="aardSettings.polling.runOnSmallVideos === AardPollingOptions.Full" class="hint warn">
        Using normal polling rate on small videos is NOT recommended.
      </div>


      <div class="field">
        <div class="label">Autodetection canvas type:</div>
        <div class="select">
          <select v-model="aardSettings.aardType" @change="settings.saveWithoutReload">
            <option value="auto">Automatic</option>
            <option value="webgl">WebGL only</option>
            <option value="legacy">Legacy / fallback</option>
          </select>
        </div>
      </div>
    </div>


    <div v-if="settings.active.ui.devMode" class="settings-segment w-full">
      <h3 class="text-primary-300 text-[1.25em] mt-4 border-b-1 border-b-stone-700">Debug options</h3>
      <div class="flex flex-row w-full gap-2">
        <div class="grow flex flex-col gap-2">
          <div>
            <button v-if="eventBus" @click="eventBus?.sendToTunnel('aard-enable-debug', true)">Show debug overlay</button>
          </div>
          <div class="field">
            <div class="label">Show debug overlay on startup</div>
            <div class="checkbox">
              <input
                type="checkbox"
                v-model="settings.active.ui.dev.aardDebugOverlay.showOnStartup"
                @change="settings.saveWithoutReload"
              >
            </div>
          </div>
        </div>
        <div class="grow">
          <JsonEditor
            v-model="settingsJson"
          >
          </JsonEditor>
          <button @click="saveDebugUiSettings">Save debug UI settings</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import BrowserDetect from '@src/ext/conf/BrowserDetect';
import JsonEditor from '@components/common/JsonEditor.vue';
import {AardPollingOptions} from '@src/ext/lib/aard/enums/aard-polling-options.enum';
import {AardSubtitleCropMode} from '@src/ext/lib/aard/enums/aard-subtitle-crop-mode.enum';
import { defineComponent } from 'vue';

export default defineComponent({
  components: {
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
      AardSubtitleCropMode
    }
  },
  computed: {
    aardSettings() {
      return this.settings.active.aard.useLegacy ? this.settings.active.aardLegacy : this.settings.active.aard;
    }
  },
  created() {
    this.eventBus?.subscribe(
      'uw-config-broadcast',
      {
        source: this,
        function: (config) => this.handleConfigBroadcast(config)
      }
    );
  },
  mounted() {
    this.eventBus?.sendToTunnel('get-aard-timing');
    // this.graphRefreshInterval = setInterval(() => this.eventBus.sendToTunnel('get-aard-timing'), 500);
    this.resetSettingsEditor();
  },
  destroyed() {
    this.eventBus?.unsubscribeAll(this);
    clearInterval(this.graphRefreshInterval);
  },
  methods: {
    async openOptionsPage() {
      BrowserDetect.runtime.openOptionsPage();
    },
    setArCheckFrequency(event, timer) {
      this.aardSettings.timers[timer ?? 'playing'] = Math.floor(Math.pow(Math.E, event));
      this.settings.saveWithoutReload();
    },
    setAutoDisableTimeout(event, multiplier) {
      this.aardSettings.autoDisable.ifNotChangedTimeout = Math.floor(Math.pow(Math.E, event)) * multiplier;
      this.settings.saveWithoutReload();
    },
    setSubtitleTimeout(event, multiplier) {
      this.aardSettings.subtitles.resumeAfter = Math.floor(Math.pow(Math.E, event)) * multiplier;
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
    },
    aardLegacyModeChanged() {
      this.settings.save();
    }
  },

});
</script>

<style lang="postcss" scoped module>
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

    /* graph is 100 ms wide */
    .time-budget {
      height: 100%;
      display: inline-block;
      position: relative;

      box-sizing: border-box;

      z-index: 100;

      &.hz144 {
        width: 6.9%;
      }
      &.hz120 {
        width: 1.39%;
      }
      &.hz60 {
        width: 8.33%;
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
