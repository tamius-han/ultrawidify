<template>
  <div class="flex flex-column" style="padding-bottom: 20px">
    <!-- <div class="">
      <div class="label">Player picker</div>
      <div class="desc">
        If extension doesn't detect player correctly, you can override it.
        <small>(NOTE: this currently doesn't work for embedded videos)</small>
      </div>
      
      <div>Meaning of outlines:</div>

      <div class="flex flex-row flex-wrap">
        <div class="pp_video flex flex-nogrow"><code>&lt;video&gt;</code>&nbsp;element</div>
        <div class="pp_current flex flex-nogrow">Selected and not matched</div>
        <div class="pp_matched flex flex-nogrow">Elements that match query selector</div>
        <div class="pp_current_matched">Selected and matched, selector ok</div>
        <div class="pp_match_children">Selected and matched, selector too vague</div>
      </div>

      <div class="flex flex-row">
        <ShortcutButton label="Move up"
        />
        <ShortcutButton label="Move down"
        />
      </div>
      <div class="flex flex-row flex-wrap">
        <QsElement selector="#test_id" />
        <QsElement selector=".test_class" />
        <template v-for="qse of currentElementQs" >
          <QsElement :selector="qse" :key="qse" />
        </template>
      </div>


    </div> -->

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
      
    </div>

    <div class="label">
      Additional css<br/><small>for {{site}}</small>
    </div>
    <div class="description">
      This css will be inserted into webpage every time it loads.
    </div>
    <div class="flex flex-column">
        <textarea
               v-model="playerCss"
               @change="updatePlayerCss"
               @blur="updatePlayerCss"
        >
        </textarea>
    </div>
    
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
  </div>
</template>

<script>
import ShortcutButton from '../../common/components/ShortcutButton.vue';
import QsElement from '../../common/components/QsElement.vue';
import QuerySelectorSetting from '../../common/components/QuerySelectorSetting.vue';
import ExtensionMode from '../../common/enums/ExtensionMode.enum';
import VideoAlignmentType from '../../common/enums/VideoAlignmentType.enum';
import StretchType from '../../common/enums/StretchType.enum';
export default {
  components: {
    QuerySelectorSetting,
    ShortcutButton,
    QsElement,
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
      this.videoManualQs = this.settings.active.sites[this.site].DOM.video.manual || this.videoManualQs;
      this.videoQs = this.settings.active.sites[this.site].DOM.video.querySelectors;
      this.videoCss = this.settings.active.sites[this.site].DOM.video.additionalCss;
    } catch (e) {
      // that's here just in case relevant settings for this site don't exist yet
    }
    
    try {
      this.playerManualQs = this.settings.active.sites[this.site].DOM.player.manual || this.playerManualQs;
      this.playerQs = this.settings.active.sites[this.site].DOM.player.querySelectors;
      this.playerByNodeIndex = this.settings.active.sites[this.site].DOM.player.useRelativeAncestor || this.playerByNodeIndex;
      this.playerParentNodeIndex = this.settings.active.sites[this.site].DOM.player.videoAncestor;
    } catch (e) {
      // that's here just in case relevant settings for this site don't exist yet
    }

    try {
      this.playerCss = this.settings.active.sites[this.site].css || '';
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
          stretch: StretchType.Default,
          videoAlignment: VideoAlignmentType.Default,
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
    updatePlayerCss() {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].css = this.playerCss;
      this.settings.save();
    },
    updatePlayerParentNodeIndex() {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].DOM.player.videoAncestor = this.playerParentNodeIndex;
      this.settings.save();
    },
    toggleVideoManualQs() {
      this.ensureSettings('video');
      this.videoManualQs = !this.videoManualQs;
      this.settings.active.sites[this.site].DOM.video.manual = this.videoManualQs;
      this.settings.save();
    },
    togglePlayerManualQs() {
      this.ensureSettings('player');
      this.playerManualQs = !this.playerManualQs;
      this.settings.active.sites[this.site].DOM.player.manual = this.playerManualQs;
      this.settings.save();
    },
    toggleByNodeIndex() {
      this.ensureSettings('player');
      this.playerByNodeIndex = !this.playerByNodeIndex;
      this.settings.active.sites[this.site].DOM.player.useRelativeAncestor = this.playerByNodeIndex;
      this.settings.save();
    },
  }

}
</script>

<style>
.pp_video {
  margin: 2px;
  padding: 5px;
  border: 1px solid #00f;
}
.pp_current {
  margin: 2px;
  padding: 5px;
  border: 1px solid #88f;
}
.pp_matched {
  margin: 2px;
  padding: 5px;
  border: 1px dashed #fd2;
}
.pp_current_matched {
  margin: 2px;
  padding: 2px;
  border: 2px solid #027a5c;
}
.pp_match_children {
  margin: 2px;
  padding: 2px;
  border: 2px solid #f00;
}
</style>
