<template>

  <div class="flex flex-col ml-12 p-4">
    <div class="text-[1.75em] font-thin text-primary-400">Ultrawidify</div>
    <div class="-mb-1 text-stone-500 text-[0.9em]">Version {{addonVersion}}/{{addonSource}} ({{addonChannel}})</div>
    <div class="text-stone-500 text-[0.9em]">Source code can be viewed on <a target="_blank" src="https://github.com/tamius-han/ultrawidify">github</a>.</div>
  </div>

  <p>
    Please report <strike>undocumented features</strike> bugs using one of the following options (in order of preference):
  </p>
  <ul>
    <li> <a target="_blank" href="https://github.com/tamius-han/ultrawidify/issues"><b>Github (preferred)</b></a><br/></li>
    <li>Email: <a target="_blank" :href="mailtoLink">tamius.han@gmail.com</a></li>
  </ul>
  <p>
    When reporting bugs, please include the following info:
  </p>

  <div class="bg-stone-900 border-l border-l-primary-500 px-4 py-2 font-mono pre">
    Ultrawidify version: <span class="text-primary-400">{{addonVersion}}</span><br/>
    Install source:      <span class="text-primary-400">{{addonSource ?? '[fill out]'}}</span><br/>
    OS:                  [fill out]
  </div>

  <p>
    In addition, please include a description of your issue, which should ideally include:
  </p>

  <ul>
    <li>What doesn't work</li>
    <li>Where it happens (which website)</li>
    <li>Steps to reproduce the issue</li>
    <li>What you expected to happen</li>
    <li>What actually happened</li>
  </ul>

  <p>
    Optionally, you can also include screenshots in your report (though if screenshots contain any personal info,
    such as names or addresses, you should redact that).
  </p>

  <h3>Thank you monies</h3>
  <p>
    If you think I deserve money for the work I did up to this point, you can bankroll my caffeine addiction.
  </p>
  <p class="text-center">
    <a class="donate" href="https://www.paypal.com/paypalme/tamius" target="_blank">Donate on Paypal</a>
  </p>
  <p>
    If you're into that, you can also stoke my ego over at
    <a href="https://instagram.com/shaman_urkog" target="_blank">instagram</a> or
    <a href="https://bsky.app/profile/tamius-han.bsky.social" target="_blank">bluesky</a>
    by liking the stuff I put up on there <small>mostly things related to mini-painting</small>.
  </p>
</template>
<script lang="ts">
import BrowserDetect from '@src/ext/conf/BrowserDetect';

export default({
  props: [
    'settings'
  ],
  data() {
    return {
      BrowserDetect: BrowserDetect,
      // reminder — webextension-polyfill doesn't seem to work in vue!
      addonVersion: chrome.runtime.getManifest().version,
      addonSource: BrowserDetect.processEnvBrowser,
      addonChannel: BrowserDetect.processEnvChannel,
      mailtoLink: '',
      redditLink: '',
      showEasterEgg: false,
    }
  },
  mounted() {
    this.addonSource = BrowserDetect.processEnvBrowser;
    this.addonChannel = BrowserDetect.processEnvChannel;
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
