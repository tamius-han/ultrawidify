<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.4<small>.2</small></p>
    <ul>
      <li>Tab detection in extension popup has been made more accurate</li>
      <li>QoL: Added user-accessible logger (to make fixing sites I can't access a bit easier)</li>
      <li>Changed links to reflect my github username change</li>
      <li><b>[4.4.4.1]</b> There were multiple reports about popup being broken. This issue should be resolved.</li>
      <li><b>[4.4.4.1]</b> Setting global/site defaults should no longer require page reloads.</li>
      <li><b>[4.4.4.2]</b> Fix problem with video being offset while switching between full screen and non-fullscreen non-theater mode on Youtube</li>
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
