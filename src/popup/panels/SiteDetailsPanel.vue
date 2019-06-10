<template>
  <div class="w100 flex flex-column" style="padding-bottom: 20px">
    <div class="label">
      Video detection settings<br/><small>for {{site}}</small>
    </div>
    <div class="description">Video is just the moving picture bit without the player.</div>
    <div class="">
      <div class="">
        <input :checked="!videoManualQs"
                @change="toggleVideoManualQs"
                type="checkbox" 
        /> Detect automatically
      </div>
      <div class="flex flex-column">
        <div class="flex label-secondary form-label">Query selectors</div>
        <input type="text"
               v-model="videoQs"
               :disabled="!videoManualQs"
               @change="updateVideoQuerySelector"
               @blur="updateVideoQuerySelector"
        />
      </div>
      <div class="flex flex-column">
        <div class="flex label-secondary form-label">Additional css</div>
        <input type="text"
               v-model="videoCss"
               @change="updateVideoCss"
               @blur="updateVideoCss"
        />
      </div>

    </div>

    <div class="label">
      Player detection settings<br/><small>for {{site}}</small>
    </div>
    <div class="description">
      Player is the frame around the video. Extension crops/stretches the video to fit the player.
    </div>
    <div class="">
      <div class="">
        <input :checked="!playerManualQs"
                @change="togglePlayerManualQs"
                type="checkbox" 
        /> Detect automatically
      </div>

      <div class="flex flex-column">
        <div class="">Query selectors:</div>
        <input type="text"
               v-model="playerQs"
               @change="updatePlayerQuerySelector"
               @blur="updatePlayerQuerySelector"
               :disabled="playerByNodeIndex || !playerManualQs"
        />
      </div>

      <div class="">
        <input :checked="playerByNodeIndex"
               :disabled="!playerManualQs"
                @change="toggleByNodeIndex"
                type="checkbox" 
        /> Specify player node parent index instead
      </div>

      <div class="flex flex-column">
        <div class="">Player node parent index:</div>
         <input v-model="playerParentNodeIndex"
                :disabled="!playerByNodeIndex || !playerManualQs"
                @change="updatePlayerParentNodeIndex"
                @blur="updatePlayerParentNodeIndex"
                type="number" 
         />
      </div>
      <div class="flex flex-column">
        <div class="flex label-secondary form-label">Additional css</div>
        <input type="text"
               v-model="playerCss"
               @change="updatePlayerCss"
               @blur="updatePlayerCss"
        />
      </div>
    </div>
  </div>
</template>

<script>
import QuerySelectorSetting from '../../common/components/QuerySelectorSetting.vue';
import ExtensionMode from '../../common/enums/extension-mode.enum';
import VideoAlignment from '../../common/enums/video-alignment.enum';
import Stretch from '../../common/enums/stretch.enum';
export default {
  components: {
    QuerySelectorSetting,
  },
  data() {
    return {
      videoManualQs: false,
      videoQs: '',
      videoCss: '',
      playerManualQs: false,
      playerQs: '',
      playerCss: '',
      playerByNodeIndex: false,
      playerParentNodeIndex: undefined,
    };
  },
  props: {
    site: String,
    settings: Object,
  },
  created() {
    try {
      this.videoManualQs = settings.active.sites[this.site].DOM.video.manual || this.videoManualQs;
      this.videoQs = settings.active.sites[this.site].DOM.video.querySelectors;
      this.videoCss = settings.active.sites[this.site].DOM.video.additionalCss;
    } catch (e) {
      // that's here just in case relevant settings for this site don't exist yet
    }
    
    try {
      this.playerManualQs = settings.active.sites[this.site].DOM.player.manual || this.playerManualQs;
      this.playerQs = settings.active.sites[this.site].DOM.player.querySelectors;
      this.playerCss = settings.active.sites[this.site].DOM.player.additionalCss;
      this.playerByNodeIndex = settings.active.sites[this.site].DOM.player.useRelativeAncestor;
      this.playerParentNodeIndex = settings.active.sites[this.site].DOM.player.videoAncestor;
    } catch (e) {
      // that's here just in case relevant settings for this site don't exist yet
    }
  },
  methods: {
    ensureSettings(scope) {
      if (! this.settings.active.sites[this.site]) {
        this.settings.active.sites[this.site] = {
          mode: ExtensionMode.Default,
          autoar: ExtensionMode.Default,
          type: 'user-added',
          stretch: Stretch.Default,
          videoAlignment: VideoAlignment.Default,
          keyboardShortcutsEnabled: ExtensionMode.Default,
        }
      }
      if (! this.settings.active.sites[this.site].DOM) {
        this.settings.active.sites[this.site].DOM = {};
      }
      if (! this.settings.active.sites[this.site].DOM[scope]) {
        this.settings.active.sites[this.site].DOM[scope] = {
          manual: false,
          querySelectors: '',
          additionalCss: '',
          useRelativeAncestor: scope === 'player' ? false : undefined,
          videoAncestor: undefined,
          playerNodeCss: scope === 'player' ? '' : undefined,
        }
      }
    },
    updateVideoQuerySelector() {
      this.ensureSettings('video');
      this.settings.active.sites[this.site].DOM.video.querySelectors = this.videoQs;
      this.settings.save();
    },
    updateVideoCss() {
      this.ensureSettings('video');
      this.settings.active.sites[this.site].DOM.video.additionalCss = this.videoCss;
      this.settings.save();
    },
    updatePlayerQuerySelector() {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].DOM.player.querySelectors = this.playerQs;
      this.settings.save();
    },
    updateVideoCss() {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].DOM.player.additionalCss = this.playerCss;
      this.settings.save();
    },
    updatePlayerParentNodeIndex() {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].DOM.player.videoAncestor = this.playerParentNodeIndex;
      this.settings.save();
    },
    toggleVideoManualQs() {
      this.ensureSettings('video');
      this.settings.active.sites[this.site].DOM.video.enabled = !this.settings.active.sites[this.site].DOM.video.enabled;
      this.videoManualQs = !this.videoManualQs;
      this.settings.save();
    },
    togglePlayerManualQs() {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].DOM.player.enabled = !this.settings.active.sites[this.site].DOM.player.enabled;
      this.playerManualQs = !this.playerManualQs;
      this.settings.save();
    },
    toggleByNodeIndex() {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].DOM.player.useRelativeAncestor = !this.settings.active.sites[this.site].DOM.player.useRelativeAncestor;
      this.playerByNodeIndex = !this.playerByNodeIndex;
      this.settings.save();
    },
  }

}
</script>

<style>

</style>
