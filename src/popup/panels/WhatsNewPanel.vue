<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.2.3[.1]</p>
    <ul>
      <li>Fixed twitchy behaviour on Twitch, Facebook and Twatter. Here's a <a href="https://stuff.tamius.net/sacred-texts/2019/08/24/ultrawidify-the-twitchy-twitch-problem/" target="_blank">blog post</a> that covers the issue in more detail.</li>
      <li>Cropping now uses user styles (as opposed to modifying element's style attribute)</li>
      <li>Fixed the issue where one-pixel letterbox would result in constant aspect ratio corrections.</li>
      <li>Started using mutation observers to watch for anything modifying the size of our video.</li>
      <li><b>[4.2.3.1]</b> fixed some bugs in popup.</li>
    </ul>
    <p>As you can tell, I don't leave reddit and youtube much. To be fair, the twitching issue was intermittent on twitch.</p>
    <p v-if="BrowserDetect.chrome"><b>Chrome users:</b> as a result of Chrome's shortcomings, there now exists one potential performance issue.
    If you notice any performance issues, please contact me via github, email or reddit (see: 'report a problem' tab
    of this popup).</p>
  </div>
</template>
<script>
import BrowserDetect from '../../ext/conf/BrowserDetect';

export default {
  data () {
    return {
      BrowserDetect: BrowserDetect
    }
  },
}
</script>

<style>

</style>
