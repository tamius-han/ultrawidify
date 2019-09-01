<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.2.4</p>
    <ul>
      <li>Improvements to player detection. More details in the <a href="https://stuff.tamius.net/sacred-texts/2019/08/31/ultrawidify-and-the-improper-cropping/" target="_blank">blog post</a>.</li>
      <li><b>[4.2.4.1]</b> Fixed default settings for reddit</li>
      <li><b>[4.2.4.1]</b> Manually specified query selectors are now also checked for compliance with player detection rules.</li>
      <li><b>[4.2.4.2]</b> Additional bugfixes. Updated/fixed default settings.</li>
    </ul>
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
