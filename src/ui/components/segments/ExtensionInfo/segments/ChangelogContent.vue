<template>
  <p class="mb-4">Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md" target="_blank">is available here</a>.</p>

  <p>Changes in version <b class="font-semibold text-primary-400">7.1.3</b>:</p>
  <ul>
    <li>Fixed the issue where default alignment options wouldn't be respected, and where alignment options would get reset with every aspect ratio change.</li>
    <li>Fixed the issue where sometimes, using alignment options would move video off-screen.</li>
  </ul>

  <p>Changes in version <b class="font-semibold text-primary-400">7.1.2</b>:</p>
  <ul>
    <li>In the previous version, content fit was changed from dropdown to buttons, but due to incorrect migration the option was missing for existing users.</li>
    <li>Fixed issue where, when playing youtube playlist, autodetection wouldn't start automatically on subsequent videos.</li>
    <li>Fixed the issue where show-UI-on-hover wouldn't work correctly after player element was resized</li>
  </ul>

  <p>Changes in version <b class="font-semibold text-primary-400">7.1.1</b>:</p>
  <ul>
    <li>Alignment options were missing from keyboard shortcut settings</li>
    <li>Added content fit options to keyboard shortcut settings</li>
    <li>Fixed issue with zoom not applying correctly when video player size changed (e.g. when switching between normal, theater, and full screen mode)</li>
    <li>Optimized extension size</li>
  </ul>

  <p>Changes in version <b class="font-semibold text-primary-400">7.1.0</b>:</p>
  <ul>
    <li>Popup UI was made more compact</li>
    <li>UI now fits more aspect ratio with less clutter</li>
    <li>
      Combined crop and zoom sections into a single control. Switching between cropping and zooming has been delegated to a dropdown menu, as
      it is assumed that people generally stick to only one of these modes at a time.
    </li>
    <li>
      There's three crop/zoom modes now. Previously, extension did crop (which ensures no part of the video is cut off) and zoom (which ensures no letterboxing).
      This version introduces unconstrained zoom, which zooms into video without trying to ensure a specific fit.
    </li>
    <li>
      Aspect ratios are sorted in all interfaces
    </li>
    <li><b>Keyboard shortcuts have been updated to accommodate the new cropping strategy</b></li>
  </ul>

  <p>Changes in version <b class="font-semibold text-primary-400">7.0.0</b>:</p>

  <p>It's been two+ weeks, I can probably drop that.</p>

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
