<template>
  <p class="mb-4">Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md" target="_blank">is available here</a>.</p>

  <p>Changes in version <b class="font-semibold text-primary-400">6.4.0</b>:</p>
  <ul>
    <li>In-player UI can now appear in full-screen for websites that put players into top layer (allegedly).</li>
    <li>Embedded sites now inherit settings of the parent frame. <small>However, this hasn't been tested for all edge cases and may contain bugs.</small></li>
    <li>Added validation to custom aspect ratio entry menu. Corrected parsing of aspect ratios given in the X:Y format, even though aspect ratios should be ideally given as a single number.</li>
    <li>Autodetection can be set to stop after first aspect ratio detection, or after a period of no changes.</li>
    <li>
      There is a new, experiental mode for autodetection. At this point, it can be manually enabled in the autodetection settings. It will become the default option in 2026.<br/>
      If you enable experimental mode, please consider reporting problems <a href="https://github.com/tamius-han/ultrawidify/issues/291" target="_blank">in this thread</a> on Github.
    </li>
    <li>
      Autodetection can now detect hardcoded subtitles. You may change how extension handles subtitles in the settings.
      Use of new experimental autodetection is required for subtitle handling options to work.
    </li>
    <li>
      Keyboard shortcut settings have been split from UI settings, and are now presented in list form on the settings page.
    </li>
    <li>
      Re-design of settings page.
    </li>
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
    this.settings.saveWithoutReload();
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
