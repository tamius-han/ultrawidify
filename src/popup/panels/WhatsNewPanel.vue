<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.3.1.1</p>
    <ul>
      <li><b>[4.3.3.1]</b> Patched twitch.tv</li>
      <li>Minor rework of settings page (actions & shortcuts section)</li>
      <li>Fixed bug that prevented settings page from opening</li>
    </ul>
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
