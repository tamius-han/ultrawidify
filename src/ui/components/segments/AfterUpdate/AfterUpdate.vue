<template>
  <div class="flex flex-col h-full justify-center items-center">
    <template v-if="!settings || !settings.active">Please wait ...</template>
    <template v-else>
      <!-- {{settings.active}} -->
      <div class="body flex-grow text-stone-300">
        <h1 class="text-[1.75rem] text-primary-300">Ultrawidify has been updated</h1>
        <br/>
        <p>Congrats, you're part of the lucky 10% who got volunteered for early access. Please consider reporting issues via <a href="https://github.com/tamius-han/ultrawidify/issues" target="_blank">github</a> or e-mail</p> (and please follow the template).
        <p>Normally I don't bother people with stuff like this, but there's been some new features and notable updates.</p>


        <div class="flex flex-col gap-4 mt-8 max-w-[720px]">
          <h3>Autodetection</h3>
          <p><b>TL;DR: new features:</b> pillarbox detection, subtitle detection; <b>notable improvements:</b> more resistance to unwanted aspect ratio fluctuations.</p>

          <div>
            <div class="field">
              <div class="label">Enable autodetection by default?</div>
              <div class="select">
                <select
                  :value="settings.active.sites['@global'].enableAard"
                >
                  <option :value="ExtensionMode.Disabled">
                    Disabled by default
                  </option>
                  <option :value="ExtensionMode.FullScreen">
                    Fullscreen only
                  </option>
                  <option :value="ExtensionMode.Theater">
                    Fullscreen and theater mode
                  </option>
                  <option :value="ExtensionMode.All">
                    Always
                  </option>
                </select>
              </div>
            </div>
            <div class="hint">
              This setting can be overridden per site. This settings overrides 'default crop' setting.<br/>
              Autodetection should run without major performance impact on most modern-ish devices. That being said,
              if you use potato-tier hardware (<= 4C4T CPU, <= GTX 1070 equivalent), you might want
              to turn this off.<br/>
              This field should default to your current setting.
            </div>

            <div class="field">
              <div class="label">Subtitle handling</div>
              <div class="select">
                <select v-model="settings.active.aard.subtitles.subtitleCropMode">
                  <option :value="AardSubtitleCropMode.ResetAR">Reset aspect ratio while subtitles are visible</option>
                  <option :value="AardSubtitleCropMode.ResetAndDisable">Reset aspect ratio and stop autodetection for the video</option>
                  <option :value="AardSubtitleCropMode.IgnoreSubtitles">Ignore subtitles</option>
                </select>
              </div>
            </div>
            <div v-if="settings.active.aard.subtitles.subtitleCropMode === AardSubtitleCropMode.ResetAR" class="field">
              <div class="label">After subtitles disappear, wait this long before resuming detection:</div>
              <div class="range-input">
                <input
                  type="range"
                  :value="Math.log(settings.active.aard.subtitles.resumeAfter / 10)"
                  @change="setSubtitleTimeout($event.target.value, 10)"
                  min="2.3"
                  max="9.3"
                  step="0.01"
                />
                <input
                  :value="settings.active.aard.subtitles.resumeAfter / 1000"
                  @change="setSubtitleTimeout($event.target.value, 1000)"
                  class="input"
                  type="text"
                >
                <div class="unit">s</div>
              </div>
            </div>
            <div class="field">
              <div class="label">
                Subtitle detection speed/certainty
              </div>
              <div class="flex flex-col gap-0">
                <div class="flex flex-row gap-4">
                  <span>Fast</span><input type="range" min="2" max="8" v-model="settings.active.aard.subtitles.stability.confirmationScans" /><span>Certain</span>
                </div>
                <div class="text-[0.8rem] text-stone-500">
                  Require subtitles to be detected for {{ settings.active.aard.subtitles.stability.confirmationScans }} consecutive scans before taking action
                </div>
              </div>
            </div>
            <div class="field">
              <div class="label">Limit autodetection to:</div>
              <div class="select">
                <select :value="currentAardFrequency" @click="updateAutodetectionLimit($event)">
                  <option :value="-1">Other value</option>
                  <option :value="0">Unlimited (max. once per video frame)</option>
                  <option :value="10">60/s</option>
                  <option :value="25">30/s</option>
                  <option :value="50">15/s</option>
                  <option :value="500">2/s</option>
                  <option :value="1000">Once per second</option>
                  <option :value="5000">Once every 5 seconds</option>
                </select>
              </div>
            </div>
            <div class="hint">
              In addition to this option, performance-based limits apply. Autodetection will never run more than once per video frame, and if your hardware/browser cannot
              process autodetection scans fast enough, autodetection will skip scanning video frames until the last aspect ratio scan finishes.
            </div>

            <div class="field">
              <div class="label">Aspect ratio detection speed/certainty</div>
              <div class="flex flex-col gap-0">
                <div class="flex flex-row gap-4">
                  <span>Fast</span><input type="range" min="1" max="10" v-model="settings.active.aard.stability.arSampleCount" /><span>Certain</span>
                </div>
                <div class="text-[0.8rem] text-stone-500">
                  Require same aspect ratio on {{ settings.active.aard.stability.arSampleCount }} consecutive scans before taking action
                </div>
              </div>
            </div>
          </div>
          <p>Additional options available in settings.</p>

          <div>
            <div class="text-stone-400 text-[0.9rem]">
              <p><b class="text-orange-400">Note:</b> subtitle detection comes with brand new way of detecting aspect ratios, which hasn't been battle-tested yet. There could be problems.</p>
              <p>Please consider reporting issues with aspect ratio detection <a href="https://github.com/tamius-han/ultrawidify/issues/291" target="_blank">in this thread</a> on Github.</p>
              <p>When reporting, include link with timestamp to the problematic part of the video (timestamp may include 5-10s of lead time) and state how often the issue triggers.</p>
            </div>
          </div>

          <h3>In-player UI</h3>
          <p><b>TL;DR:</b> UI can be set to only activate while holding CTRL and moving mouse. Menu position can be changed (in full settings).</p>

          <div>
            <div class="field">
              <div class="label">Enable in-player UI:</div>
              <div class="select">
                <select v-model="settings.active.sites['@global'].enableUI">
                  <option :value="ExtensionMode.All">Always</option>
                  <option :value="ExtensionMode.Theater">While in full screen or theater mode</option>
                  <option :value="ExtensionMode.FullScreen">While in full screen</option>
                  <option :value="ExtensionMode.Disabled">Never</option>
                </select>
              </div>
            </div>
            <div class="hint">
              This is the default option and can be overridden per site.
            </div>

            <div class="field" :class="{ 'disabled': settings.active.sites['@global'].enableUI === ExtensionMode.Disabled }">
              <div class="label">Show UI when:</div>
              <div class="select">
                <select v-model="settings.active.ui.inPlayer.activation">
                  <option value="player">Moving mouse over video player</option>
                  <option v-if="settings.active.ui.inPlayer.activation === 'trigger-zone'" value="trigger-zone">When moving mouse over the trigger zone (REMOVED OPTION — please pick 'distance' option and configure activation distance)</option>
                  <option value="distance">(experimental) When moving mouse close to the menu activator</option>
                  <option value="none">Don't show UI (unless 'show while holding ctrl' option says otherwise)</option>
                </select>
              </div>
            </div>
            <div v-show="settings.active.ui.inPlayer.activation === 'distance'" class="field" :class="{ 'disabled': settings.active.sites['@global'].enableUI === ExtensionMode.Disabled }">
              <div class="label">
                Show menu when mouse is closer than:
              </div>
              <div class="input range-input">
                <input
                  v-model="settings.active.ui.inPlayer.activationDistance"
                  class="slider"
                  type="range"
                  min="10"
                  max="100"
                  step="1"
                >
                <input
                  style="margin-right: 0.6rem;"
                  v-model="settings.active.ui.inPlayer.activationDistance"
                >
                <select
                  class="unit-select !min-w-[72px]"
                  v-model="settings.active.ui.inPlayer.activationDistanceUnits"
                >
                  <option value="%">%</option>
                  <option value="px">px</option>
                </select>
              </div>
            </div>
            <div class="field" :class="{ 'disabled': settings.active.sites['@global'].enableUI === ExtensionMode.Disabled }">
              <div class="label">Also show UI when holding ctrl & moving mouse:</div>
              <div class="select">
                <select v-model="settings.active.ui.inPlayer.activateWithCtrl">
                  <option :value="true">Yes</option>
                  <option :value="false">No</option>
                </select>
              </div>
            </div>
          </div>

          <h3>Pan and zoom</h3>
          <p><b>TL;DR:</b> panning with mouse is back.</p>

          <div>
            <div class="field !flex-col !items-start gap-2">
              <b class="text-white">
                Panning
              </b>
              <p>Panning allows you to align the video by moving your mouse while holding a modifier key. Choose your preferred key.</p>
              <div class="select">
                <select v-model="optionCache.mousePan" @change="updatePanOptions()">
                  <option value="">Disable panning</option>
                  <option value="shift">Hold Shift</option>
                  <option value="ctrl">Hold Ctrl</option>
                  <option value="ctrlshift">Hold Ctrl + Shift</option>
                </select>
              </div>
              <small>In the settings, you can also invert pan direction.</small>
            </div>
          </div>

          <div>
            <div class="field !flex-col !items-start gap-2">
              <b class="text-white">
                Zooming with scroll
              </b>
              <p>You can scroll to zoom the video while holding a modifier key.</p>
              <p>
                <b>This option is off by default, as it may cause random tab crashes in Google Chrome under certain but unknown conditions.</b> <b class="text-red-500">You have been warned, don't make me Linus-proof this.</b>
                If you decide giving this option a go, <a href="https://github.com/tamius-han/ultrawidify/discussions/359" target="_blank">consider sharing your experience in this thread</a> after using this feature for a few days (about a week).
              </p>
              <div class="select">
                <select v-model="settings.active.mouseOptions.shiftZoom">
                  <option :value="false">Disable zooming</option>
                  <option :value="true">Enable zooming with shift + scroll</option>
                </select>
              </div>
              <small>In the extension settings, you can also invert scroll direction.</small>
            </div>
          </div>

          <div class="flex flex-row w-full justify-center items-center">
            <button v-if="!settingsSaved" class="button primary" @click="saveSettings">
              Save preferences
            </button>
            <template v-else>Your settings have been saved.</template>
          </div>
          <div class="flex flex-row w-full justify-center items-center">
            <a class="button primary" @click="redirectToFullSettings">
              More settings ...
            </a>
          </div>


        </div>

        <br/>
        <br/>

        <p>You can always change your settings later.</p>

        <br/>
        <br/>
        <br/>
        <br/>

        <br/>
        <h3>Dev blogs associated with this release</h3>
        <ul>
          <li><a href="https://stuff.tamius.net/sacred-texts/2026/10/08/so-what-are-subtitles-actually/" target="_blank">So what are subtitles actually?</a> — writeup about subtitle detection</li>
          <li><a href="https://stuff.tamius.net/sacred-texts/2026/10/23/ultrawidify-improving-automatic-aspect-ratio-detection/" target="_blank">Ultrawidify: Improving automatic aspect ratio detection</a> — a bit about improvements to aspect ratio auto-detection in general.</li>
        </ul>
        <p>Quality of writing is not guaranteed.</p>
        <p>There's also a changelog to your left.</p>
      </div>


      <div class="footer flex-nogrow flex-noshrink">
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import BrowserDetect from '@src/ext/conf/BrowserDetect';
import { LogAggregator } from '@src/ext/module/logging/LogAggregator';
import { ComponentLogger } from '@src/ext/module/logging/ComponentLogger';
import Settings from '@src/ext/module/settings/Settings';
import { AardSubtitleCropMode } from '@src/ext/module/aard/enums/aard-subtitle-crop-mode.enum';
import ExtensionMode from '@src/common/enums/ExtensionMode.enum';

export default {
  props: [
    'settings',
  ],
  data () {
    return {
      AardSubtitleCropMode,
      ExtensionMode,
      placeholderSubtitleCrop: AardSubtitleCropMode.ResetAR,
      settingsInitialized: false,
      settingsSaved: false,
      currentAardFrequency: -1,

      optionCache: {
        mousePan: '',
      }
    }
  },
  async created() {
    this.logAggregator = new LogAggregator('');
    this.logger = new ComponentLogger(this.logAggregator, 'App.vue');

    this.placeholderSubtitleCrop = this.settings.active.aard.subtitles?.subtitleCropMode ?? AardSubtitleCropMode.ResetAR;
    this.settingsInitialized = true;

    // if youtube is enabled, we make that the default
    // this is done because setting extension globally off would also set aard to globally off, even tho that maybe shouldn't have happened
    if (
      this.settings.active.sites['@global'].enableAard === ExtensionMode.Disabled
      && this.settings.active.sites['www.youtube.com'].enableAard !== ExtensionMode.Default
    ) {
      this.settings.active.sites['@global'].enableAard = this.settings.active.sites['www.youtube.com'].enableAard;
    }

    if (!this.settings.active.ui.inPlayer.activateWithCtrl) {
      this.settings.active.ui.inPlayer.activateWithCtrl = false;
    }
  },
  mounted() {
    this.optionCache.mousePan = `${this.settings.active.mouseOptions.ctrlPan ? 'ctrl' : ''}${this.settings.active.mouseOptions.shiftPan ? 'shift' : ''}`;

    switch (+this.settings.active.aard.timers.playing) {
      case 0:
        this.currentAardFrequency = 0;
        break;
      case 10:
        this.currentAardFrequency = 10;
        break;
      case 25:
        this.currentAardFrequency = 25;
        break;
      case 50:
        this.currentAardFrequency = 50;
        break;
      case 500:
        this.currentAardFrequency = 500;
        break;
      case 1000:
        this.currentAardFrequency = 1000;
        break;
      case 5000:
        this.currentAardFrequency = 5000;
        break;
      default:
        this.currentAardFrequency = -1;
        break;
    }
  },
  components: {
  },
  methods: {
    updateAutodetectionLimit(event: Event) {
      const target = event.target as HTMLSelectElement;
      const v = Number(target.value);
      if (isNaN(v)) {
        return;
      }
      this.settings.active.aard.timers.playing = v;
    },
    async redirectToFullSettings() {
      await this.saveSettings();
      window.location.hash = '#settings';
      window.location.reload();
    },
    async updateConfig() {
      await this.settings.init();
      this.$nextTick( () => this.$forceUpdate());
    },
    async saveSettings() {
      this.settings.active[this.settings.active.aard.useLegacy ? 'aardLegacy' : 'aard'].subtitles.subtitleCropMode = this.placeholderSubtitleCrop;
      await this.settings.save();
      this.settingsSaved = true;
    },
    updatePanOptions() {
      this.settings.active.mouseOptions.ctrlPan = this.optionCache.mousePan.includes('ctrl');
      this.settings.active.mouseOptions.shiftPan = this.optionCache.mousePan.includes('shift');
    },
    setSubtitleTimeout(event, multiplier) {
      this.settings.active.aard.subtitles.resumeAfter = Math.floor(Math.pow(Math.E, event)) * multiplier;
    },

  }
}
</script>

<style lang="postcss" scoped>
</style>
