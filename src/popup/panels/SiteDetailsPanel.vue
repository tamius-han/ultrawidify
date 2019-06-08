<template>
  <div class="w100 flex flex-column" style="padding-bottom: 20px">
    <div class="label">Video detection settings<br/><small>for {{site}}</small></div>
    <div class="description">Video is just the moving picture bit without the player.</div>
    <div class="indent">
      <div class="flex flex-row row-padding">
        <div class="flex label-secondary form-label">Manually specify video element</div>
        <div class="flex flex-input">
          <input :checked="videoManualQs"
                 @change="toggleVideoManualQs"
                 type="checkbox" 
                  />
        </div>
      </div>

      <div class="flex flex-column">
        <div class="flex label-secondary form-label">Query selectors</div>
        <QuerySelectorSetting v-for="(qs, index) of siteVideoQuerySelectors"
                              :disabled="!videoManualQs"
                              :key="index"
                              @update="updateQuerySelector('video', index, $event)"
                              @delete="deleteQuerySelector('video', index)"
        />
        <div class="flex label-secondary form-label">Add new:</div>
        <QuerySelectorSetting v-if="videoManualQs"
                              adding
                              @create="addQuerySelector('video', $event)"        
        />
      </div>
    </div>

    <div class="label">Player detection settings<br/><small>for {{site}}</small></div>
    <div class="description">Player is the frame around the video. Extension crops/stretches the video to fit the player.</div>
    <div class="indent">
      <div class="flex flex-row">
        <div class="flex label-secondary form-label">Detect automatically</div>
        <div class="flex flex-input">
          <input :checked="playerManualQs"
                 @change="togglePlayerManualQs"
                 type="checkbox" 
                  />
        </div>
      </div>
      <div class="flex flex-row">
        <div class="flex label-secondary form-label">Specify player node parent index instead of query selector</div>
        <div class="flex flex-input">
          <input :checked="playerByNodeIndex"
                 @change="toggleByNodeIndex"
                 type="checkbox" 
                  />
        </div>
      </div>

      <div class="flex flex-column">
        <div class="flex label-secondary form-label">Query selectors</div>
        <QuerySelectorSetting v-for="(qs, index) of sitePlayerQuerySelectors"
                              :disabled="!playerManualQs || playerByNodeIndex"
                              :key="index"
                              @update="updateQuerySelector('video', index, $event)"
                              @delete="deleteQuerySelector('video', index)"
        />
        <div class="flex label-secondary form-label">Add new:</div>
        <QuerySelectorSetting v-if="videoManualQs"
                              adding
                              @create="addQuerySelector('video', $event)"        
        />
      </div>

      
      <div v-if="playerByNodeIndex">
        <div class="flex flex-row row-padding">
          <div class="flex label-secondary form-label">Player node parent index</div>
          <div class="flex flex-input">
            <input :value="playerByNodeIndex"
                   @change="toggleByNodeIndex"
                   type="number" 
                    />
          </div>
        </div>
        <div class="flex flex-row row-padding">
          <div class="flex label-secondary form-label">Player node css</div>
          <div class="flex flex-input">
            <input :value="playerByNodeIndex"
                   @change="toggleByNodeIndex"
                   type="number" 
                    />
          </div>
        </div>
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

    };
  },
  props: {
    site: String,
    settings: Object,
  },
  computed: {
    siteVideoQuerySelectors() {
      try {
        return settings.active.sites[this.site].DOM.video.querySelectors;
      } catch (e) {
        return [];
      }
    },
    sitePlayerQuerySelectors() {
      try {
        return settings.active.sites[this.site].DOM.player.querySelectors;
      } catch (e) {
        return [];
      }
    },
    videoManualQs: function() {
      try {
        console.log("this.settings.active.sites[this.site].DOM.video.enabled", this.settings.active.sites[this.site].DOM.video.enabled)
        return this.settings.active.sites[this.site].DOM.video.enabled
      } catch (e) {
        console.log("e",e)
        return false;
      }
    },
    playerManualQs() {
      try {
        return this.settings.active.sites[this.site].DOM.player.enabled
      } catch (e) {
        return false;
      }
    },
    playerByNodeIndex() {
      try {
        return this.settings.active.sites[this.site].DOM.player.byNodeIndex
      } catch (e) {
        return false;
      }
    },
    playerNodeIndex() {
      try {
        return this.settings.active.sites[this.site].DOM.player.nodeIndex
      } catch (e) {
        return undefined;
      }
    },
    playerNodeIndexCss() {
      try {
        return this.settings.active.sites[this.site].DOM.player.nodeIndexCss
      } catch (e) {
        return undefined;
      }
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
          enabled: false,
          querySelectors: [],
          byNodeIndex: scope === 'player' ? false : undefined,
          nodeIndex: undefined,
          nodeIndexCss: scope === 'player' ? '' : undefined,
        }
      }
    },
    updateQuerySelector(scope, index, $event) {
      this.ensureSettings(scope);
      this.settings.active.sites[this.site].DOM[scope].querySelectors[index] = $event;
      this.settings.save();
    },
    addQuerySelector(scope, index, $event) {
      this.ensureSettings(scope);
      this.settings.active.sites[this.site].DOM[scope].querySelectors.push($event);
    },
    deleteQuerySelector(scope, index) {
      this.settings.active.sites[this.site].DOM[scope].querySelectors.splice(index, 1);
    },
    toggleVideoManualQs($event) {
      this.ensureSettings('video');
      this.settings.active.sites[this.site].DOM.video.enabled = !this.settings.active.sites[this.site].DOM.video.enabled;
      this.settings.save();
    },
    togglePlayerManualQs($event) {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].DOM.player.enabled = !this.settings.active.sites[this.site].DOM.player.enabled;
      this.settings.save();
    },
    toggleByNodeIndex($event) {
      this.ensureSettings('player');
      this.settings.active.sites[this.site].DOM.player.byNodeIndex = !this.settings.active.sites[this.site].DOM.player.byNodeIndex;
      this.settings.save();
    },
  }

}
</script>

<style>

</style>
