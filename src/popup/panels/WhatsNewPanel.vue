<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.1.6</p>
    <ul>
      <li>Added new config for disney+ (courtesy of @MStefan99)</li>
      <li>Chrome hardware acceleration is bugged and cannot be worked around in-extension. Only way to fix this is for users to change their Google Chrome settings. Added naggathon with instructions into the extension popup.</li>
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
