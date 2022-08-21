<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.1.5</p>
    <small><sup>By Smodur's tail, this "let's respect people's CPUs and NOT call <code>drawImage()</code> / <code>getImageData()</code> twice when we don't have to" update is low key <i>not</i> going well.</sup></small>
    <ul>
      <li>Fixed laginess in Chromium-based browsers on Windows. Details in <a href="https://github.com/tamius-han/ultrawidify/issues/199#issuecomment-1221383134" target="blank">#199</a>.</li>
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
