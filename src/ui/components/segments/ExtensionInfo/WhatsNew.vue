<template>
  <div class="flex flex-col w-full h-full gap-2">
    <h2 class="text-[1.75em]">What's new</h2>
    <div class="flex flex-row md:flex-col gap-4">
      <div>
        <h3>Changelog</h3>
        <ChangelogContent :settings="settings"></ChangelogContent>
      </div>

      <div>
        <h3>Report problems</h3>
        <ExtensionInfoContent :settings="settings"></ExtensionInfoContent>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import BrowserDetect from '@src/ext/conf/BrowserDetect';
import { defineComponent } from 'vue';
import ChangelogContent from './segments/ChangelogContent.vue';
import ExtensionInfoContent from './segments/ExtensionInfoContent.vue';

export default defineComponent({
  components: {
    ChangelogContent,
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
<style lang="scss" scoped>
.flex {
  display: flex;
}
.flex-row {
  flex-direction: row;
}

.grow {
  flex-grow: 1;
}

p, li {
  font-size: 1rem;
}
small {
  opacity: 0.5;
  font-size: 0.8em;
}
a {
  color: #fa6;
}
.text-center {
  text-align: center;
}
.donate {
  margin: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background-color: #fa6;
  color: #000;
}
</style>
