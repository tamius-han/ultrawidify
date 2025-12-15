<template>
  <div class="flex flex-col w-full h-full gap-2">
    <h2 class="text-[1.75em]">About Ultrawidify</h2>
    <ExtensionInfoContent :settings="settings"></ExtensionInfoContent>
  </div>
</template>
<script lang="ts">
import BrowserDetect from '@src/ext/conf/BrowserDetect';
import { defineComponent } from 'vue';
import ExtensionInfoContent from './segments/ExtensionInfoContent.vue';

export default defineComponent({
  components: {
    ExtensionInfoContent,
  },
  props: [
    'settings'
  ],
  data() {
    return {
      BrowserDetect: BrowserDetect,
      // reminder — webextension-polyfill doesn't seem to work in vue!
      addonVersion: BrowserDetect.firefox ? chrome.runtime.getManifest().version : chrome.runtime.getManifest().version,
      addonSource: BrowserDetect.processEnvVersion,
      mailtoLink: '',
      redditLink: '',
      showEasterEgg: false,
    }
  },
  mounted() {
    this.settings.active.whatsNewChecked = true;
    this.settings.saveWithoutReload();
  }
});
</script>
