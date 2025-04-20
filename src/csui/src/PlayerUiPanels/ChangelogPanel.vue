<template>
  <div class="flex flex-col w-full h-full gap-2">
    <div class="flex flex-row gap-8 bg-black flex-wrap">
      <div class="min-w-[400px] max-w-[520px] grow-1 shrink-1">
        <h1>What's new</h1>
        <!-- <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md" target="_blank">is available here</a>.</p> -->

        <h2>6.2.5</h2>
        <ul>
          <li>'Show UI' button was moved to popup header. Extension popup now defaults to 'crop options' tab</li>
          <li>Fixed the bug where current extension settings wouldn't be displayed correctly in the popup</li>
          <li>Fixed the issue where extension options using the "Extension default" mode would always be disabled</li>
          <li>Added the ability to import and export settings (ft. developer mode editor)</li>
          <li>Added some toys not intended for general audience (Aard now has debug tools).</li>
          <li>Fixed an issue where aspect ratio wouldn't get calculated correctly on youtube videos with native aspect ratios other than 16:9</li>
          <li>Fixed an issue that would crash the extension if video element didn't have a player element associated with it</li>
          <li>Fixed an issue where extension sometimes wouldn't work if video element was grafted/re-parented to a different element</li>
        </ul>
      </div>
      <div class="min-w-[400px] max-w-[520px] grow-1 shrink-1">
        <h2>Report a problem</h2>
        <p>
          Please report <strike>undocumented features</strike> bugs using one of the following options (in order of preference):
        </p>
        <ul>
          <li> <a target="_blank" href="https://github.com/tamius-han/ultrawidify/issues"><b>Github (preferred)</b></a><br/></li>
          <li>Email: <a target="_blank" :href="mailtoLink">tamius.han@gmail.com</a></li>
        </ul>
        <p>
          When reporting bugs, please include extension version, whether you installed the extension from, and description of your problem.
        </p>
        <p>&nbsp;</p>
        <p>&nbsp;</p>
        <h2>Thank you monies</h2>
        <p>
          If you think I deserve money for the work I did up to this point, you can bankroll my caffeine addiction.
        </p>
        <p class="text-center">
          <a class="donate" href="https://www.paypal.com/paypalme/tamius" target="_blank">Donate on Paypal</a>
        </p>
      </div>
    </div>
  </div>
</template>
<script>

export default({
  props: [
    'settings'
  ],
  data() {
    return {
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
