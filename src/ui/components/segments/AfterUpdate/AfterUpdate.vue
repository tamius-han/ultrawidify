<template>
  <div class="flex flex-col h-full justify-center items-center">
    <template v-if="!settings || !settings.active">Please wait ...</template>
    <template v-else>
      <!-- {{settings.active}} -->
      <div class="body flex-grow text-stone-300">
        <h1 class="text-[1.75rem] text-primary-300">Ultrawidify has been updated</h1>
        <br/>
        <p>This update introduces some new experimental features:</p>

        <div class="flex flex-col gap-4 mt-8">

          <div>
            <div class="field !flex-col !items-start gap-2">
              <b class="text-white">
                What do you want to if there are subtitles in the video?
              </b>
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
            <div class="field !flex-col !items-start gap-2">
              <b class="text-white">Use experimental aspect ratio detection?</b>
              <div class="select">
                <select v-model="settings.active.aard.useLegacy">
                  <option :value="true">Use legacy detection</option>
                  <option :value="false">Use experimental detection</option>
                </select>
              </div>
              <div class="text-stone-400 text-[0.9rem]">
                <p>Experimental aspect ratio detection should be more accurate, but it hasn't been extensively tested yet.</p>
                <p>If you enable experimental mode, please consider reporting problems <a href="https://github.com/tamius-han/ultrawidify/issues/291" target="_blank">in this thread</a> on Github.</p>
                <p>Experimental detection will become the default sometime in 2026 unless people report issues.</p>
              </div>
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
      settingsSaved: false
    }
  },
  async created() {
    this.logAggregator = new LogAggregator('');
    this.logger = new ComponentLogger(this.logAggregator, 'App.vue');

    // this.placeholderSubtitleCrop = (this.settings.active.aard.useLegacy ? this.settings.active.aardLegacy.subtitles?.subtitleCropMode : this.settings.active.aard.subtitles?.subtitleCropMode) ?? AardSubtitleCropMode.ResetAR;
    this.settingsInitialized = true;
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
    }
  }
}
</script>

<style lang="postcss" scoped>
</style>
