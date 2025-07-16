<template>
  <div class="flex flex-col w-full h-full gap-2">
    <div class="flex flex-row gap-8 bg-black flex-wrap w-full">
      <div class="min-w-[400px] max-w-[520px] grow shrink">
        <h1>What's new</h1>
        <!-- <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md" target="_blank">is available here</a>.</p> -->

        <h2>6.4.0</h2>
        <ul>
          <li>In-player UI can now appear in full-screen for websites that put players into top layer</li>
          <li>Embedded sites now inherit settings of the parent frame</li>
        </ul>

      </div>
      <div style="width: 1rem; height: 0px;"></div>
      <div class="min-w-[400px] max-w-[520px] grow shrink">
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
