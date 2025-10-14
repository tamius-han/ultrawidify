<template>
  <div class="flex flex-col h100 justify-center items-center">
    <template v-if="!settingsInitialized">Please wait ...</template>
    <template v-else>
      <div class="body flex-grow">
        <h1>Ultrawidify has been updated</h1>
        <br/>
        <p>This update introduces some new experimental features:</p>
        <b>
          What do you want to if there are subtitles in the video?
        </b>
        <div class="select">
          <select v-model="placeholderSubtitleCrop">
            <option :value="AardSubtitleCropMode.ResetAR">Reset aspect ratio while subtitles are visible</option>
            <option :value="AardSubtitleCropMode.ResetAndDisable">Reset aspect ratio and stop autodetection for the video</option>
            <option :value="AardSubtitleCropMode.CropSubtitles">Crop subtitles</option>
          </select>
        </div>

        <br/>
        <b>Use experimental aspect ratio detection?</b>
        <div class="select">
          <select v-model="settings.active.aard.useLegacy">
            <option :value="true">Use legacy detection</option>
            <option :value="false">Use experimental detection</option>
          </select>
        </div>
        <p>Experimental aspect ratio detection should be more accurate, but it hasn't been extensively tested yet.</p>
        <p>If you enable experimental mode, please consider reporting problems <a href="https://github.com/tamius-han/ultrawidify/issues/291" target="_blank">in this thread</a> on Github.</p>
        <p>Experimental detection will become the default in 2026 unless people report issues.</p>


        <br/>
        <br/>

        <div class="flex flex-row w-full justify-center items-center">
          <button v-if="!settingsSaved" class="button primary" @click="saveSettings">
            Save preferences
          </button>
          <template v-else>Your settings have been saved.</template>
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

<script>
import BrowserDetect from '@src/ext/conf/BrowserDetect';
import { LogAggregator } from '@src/ext/lib/logging/LogAggregator';
import { ComponentLogger } from '@src/ext/lib/logging/ComponentLogger';
import Settings from '@src/ext/lib/settings/Settings';
import { AardSubtitleCropMode } from '@src/ext/lib/aard/enums/aard-subtitle-crop-mode.enum';

export default {
  data () {
    return {
      AardSubtitleCropMode,
      settings: {},
      settingsInitialized: false,
      logAggregator: {},
      logger: {},
      placeholderSubtitleCrop: AardSubtitleCropMode.ResetAR,
      settingsSaved: false
    }
  },
  async created() {
    this.logAggregator = new LogAggregator('');
    this.logger = new ComponentLogger(this.logAggregator, 'App.vue');

    this.settings = new Settings({updateCallback: () => this.updateConfig(), logAggregator: this.logAggregator});
    await this.settings.init();
    this.placeholderSubtitleCrop = (this.settings.active.aard.useLegacy ? this.settings.active.aardLegacy.subtitles?.subtitleCropMode : this.settings.active.aard.subtitles?.subtitleCropMode) ?? AardSubtitleCropMode.ResetAR;
    this.settingsInitialized = true;
  },
  components: {
  },
  methods: {
    async updateConfig() {
      await this.settings.init();
      this.$nextTick( () => this.$forceUpdate());
    },
    saveSettings() {
      this.settings.active[this.settings.active.aard.useLegacy ? 'aardLegacy' : 'aard'].subtitles.subtitleCropMode = this.placeholderSubtitleCrop;
      this.settings.save();
      this.settingsSaved = true;
    }
  }
}
</script>

<style src="@csui/res/css/font/overpass.css"></style>
<style src="@csui/res/css/font/overpass-mono.css"></style>
<style src="@csui/res/css/flex.scss"></style>
<style src="@csui/res/css/common.scss"></style>

<style lang="scss" scoped>
p {
  font-size: 0.9rem !important;
}

body {
  width: 800px !important;
  max-width: 800px !important;
  padding: 0px;
  margin: 0px;
}

#tablist {
  min-width: 275px;
}

.header {
  overflow: hidden;
  background-color: #7f1416;
  color: #fff;
  margin: 0px;
  margin-top: 0px;
  padding-top: 8px;
  padding-left: 15px;
  padding-bottom: 1px;
  font-size: 2.7em;
}


.menu-item-inline-desc{
  font-size: 0.60em;
  font-weight: 300;
  font-variant: normal;
}

.menu-item {
  flex-grow: 0;
  padding-left: 15px;
  padding-top: 5px;
  padding-bottom: 5px;
  font-variant: small-caps;
  border-left: transparent 5px solid;
  cursor: pointer;
  user-select: none;
}

.menu-item-darker {
  color: #999;
}

.suboption {
  display: block;
  padding-left: 15px;
  padding-right: 15px;
  padding-top: 5px;
  padding-bottom: 20px;
  min-height: 250px;
}


#no-videos-display {
  height: 100%;
  padding-top: 50px;
/*       text-align: center; */
}

.tabitem-container {
  padding-top: 0.5em;
}

.selected-tab {
  background-color: initial;
  border-left: #f18810 5px solid;
}

.tabitem {
  font-variant: normal;
  // font-size: 0.69em;
  // margin-left: 16px;
  border-left: transparent 3px solid;
  padding-left: 12px;
  margin-left: -10px;
}

.site-list {
  max-height: 200px;
}

.tabitem-selected {
  color: #fff !important;
  background-color: initial;
  border-left: #f0c089 3px solid !important;
}
.tabitem-selected::before {
  padding-right: 8px;
}

.tabitem-disabled {
  color: #cc3b0f !important;
}

.tabitem-iframe::after {
  content: "</>";
  padding-left: 0.33em;
}

.popup {
  // max-width: 780px;
  // width: 800px;
  height: 600px;
}
</style>
