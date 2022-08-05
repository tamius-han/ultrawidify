<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.1.4</p>
    <small><sup>By Smodur's tail, this "let's respect people's CPUs and NOT call <code>drawImage()</code> / <code>getImageData()</code> twice when we don't have to" update is low key <i>not</i> going well.</sup></small>
    <ul>
      <li>Fixed some problems with autodetection not returning to 16:9 when necessary if autodetection already changed aspect ratio (<a href="https://github.com/tamius-han/ultrawidify/issues/198" target="blank">#198</a>)</li>
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
