<template>
  <div class="flex flex-col h-full justify-center items-center">
    <template v-if="!settings || !settings.active">Please wait ...</template>
    <template v-else>
      <!-- {{settings.active}} -->
      <div class="body flex-grow text-stone-300">
        <h1 class="text-[1.75rem] text-primary-300">Ultrawidify has been updated</h1>
        <br/>
        <p>This update introduces a few new features:</p>

        <div class="flex flex-col gap-4 mt-8 max-w-[720px]">

          <div>
            <div class="field !flex-col !items-start gap-2">
              <b class="text-white">
                Subtitle detection
              </b>
              <p>What to do with subtitles?</p>
              <div class="select">
                <select v-model="placeholderSubtitleCrop">
                  <option :value="AardSubtitleCropMode.ResetAR">Reset aspect ratio while subtitles are visible</option>
                  <option :value="AardSubtitleCropMode.ResetAndDisable">Reset aspect ratio and stop autodetection for the video</option>
                  <option :value="AardSubtitleCropMode.CropSubtitles">Crop subtitles</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <div class="text-stone-400 text-[0.9rem]">
              <p><b>Note:</b> subtitle detection comes with brand new way of detecting aspect ratios, which hasn't been battle-tested yet. There could be problems.</p>
              <p>Please consider reporting issues with aspect ratio detection <a href="https://github.com/tamius-han/ultrawidify/issues/291" target="_blank">in this thread</a> on Github.</p>
              <p>When reporting, include link with timestamp to the problematic part of the video (timestamp may include 5-10s of lead time) and state how often the issue triggers.</p>
            </div>
          </div>

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

export default {
  props: [
    'settings',
  ],
  data () {
    return {
      AardSubtitleCropMode,
      placeholderSubtitleCrop: AardSubtitleCropMode.ResetAR,
      settingsInitialized: false,
      settingsSaved: false,

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
  },
  mounted() {
    this.optionCache.mousePan = `${this.settings.active.mouseOptions.ctrlPan ? 'ctrl' : ''}${this.settings.active.mouseOptions.shiftPan ? 'shift' : ''}`;
  },
  components: {
  },
  methods: {
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

  }
}
</script>

<style lang="postcss" scoped>
</style>
