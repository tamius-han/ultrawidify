<template>
  <!-- ADVANCED OPTIONS -->
  <div v-if="DOMConfigData" class="flex flex-col gap-2">
    <div class="flex flex-row gap-2 justify-end">
      <button>Load existing config</button>
      <button>Import from file</button>
    </div>
    <div class="field">
      <div class="label">Player detection:</div>
      <div class="select">
        <select v-model="DOMConfigData.elements.player.playerDetectionMode">
          <option :value="PlayerDetectionMode.Auto">Automatic</option>
          <option :value="PlayerDetectionMode.AncestorIndex">Fixed player container offset</option>
          <option :value="PlayerDetectionMode.QuerySelectors">Query selectors</option>
        </select>
      </div>
    </div>

    <div class="field">
      <div class="label">Use automatic detection for fallback</div>
      <div class="checkbox">
        <input type="checkbox" v-model="DOMConfigData.elements.player.allowAutoFallback" />
      </div>
    </div>

    <div class="field">
      <div class="label">Player container offset</div>
      <div class="input">
        <input v-model="DOMConfigData.elements.player.ancestorIndex" />
      </div>
      <div class="hint">
        Defines how far away from video the player container element is. If you don't know what you're doing, start
        with 1, save settings, and reload the page. If this doesn't fix your problem, increase the number by 1 and
        repeat the procedure. If no value between 1-16 works, the site may require additional CSS in order to work.
      </div>
    </div>

    <div class="field">
      <div class="label">Query selector</div>
      <div class="input">
        <input v-model="DOMConfigData.elements.player.querySelectors" />
      </div>
      <div class="hint">
        You should be at least somewhat proficient with CSS in order to use this option. If you need to provide more
        than one query selector, use commas to separate them.
      </div>
    </div>

    <div class="field">
      <div class="label">Additional CSS for the page</div>
      <div class="input">
        <textbox v-model="DOMConfigData.customCss" />
      </div>
      <div class="hint">
        You should be at least somewhat proficient with CSS in order to use this option.
      </div>
    </div>
  </div>

  <div class="w-full flex flex-row gap-2 justify-end">
    <button>Save as</button>
    <button>Save</button>
    <button>Close</button>
  </div>

  <Popup
    v-if="selectSnapshotDialog.visible"
  >

  </Popup>
</template>

<script lang="ts">
import { SiteSettings } from '@src/ext/lib/settings/SiteSettings';
import { PlayerDetectionMode } from '@src/common/enums/PlayerDetectionMode.enum';

import Popup from '@components/common/Popup.vue';


export default({
  components: {
    PlayerDetectionMode,
    Popup,
  },
  props: [
    'settings',
    'siteSettings'
  ],
  data() {
    return {
      DOMConfigData: undefined as any,
      selectSnapshotDialog: {visible: false},
    }
  },
  watch: {
    siteSettings: function (newVal: SiteSettings) {
      this.loadSiteSettings(newVal);
    }
  },
  created() {
    if (this.siteSettings?.data?.DOMConfig) {
      this.loadSiteSettings(this.siteSettings);
    }
  },
  methods: {
    loadSiteSettings(siteSettings: SiteSettings) {
      this.DOMConfigData = siteSettings.data.DOMConfig[siteSettings.data.activeDOMConfig];
    }

  }
});
</script>
