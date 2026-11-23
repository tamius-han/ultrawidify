<template>
  <p class="mb-4">Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md" target="_blank">is available here</a>.</p>

  <p>Changes in version <b class="font-semibold text-primary-400">7.1.3</b>:</p>
  <ul>
    <li>Fixed the issue where default alignment options wouldn't be respected, and where alignment options would get reset with every aspect ratio change.</li>
    <li>Fixed the issue where sometimes, using alignment options would move video off-screen.</li>
    <li>Fixed videoFit command migrations, but for real this time.</li>
  </ul>
</template>
<script>
import BrowserDetect from '@src/ext/conf/BrowserDetect';

export default({
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
    this.settings.saveWithoutReload({suppressBanner: true});
  }
});
</script>
<style lang="scss" scoped>
.donate {
  margin: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background-color: #fa6;
  color: #000;
}
</style>
