<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.3.0</p>
    <ul>
      <li>Fixed an issue where videos would get incorrectly aligned following a window resize.</li>
      <li>Fixed for videos hosted on v.reddit for new reddit</li>
      <li>Fixed the issue where setting extension to 'whitelist only' would disable 'site settings' in popup.</li>
      <li>User-friendly way of importing-exporting settings (exporting settings requires 'download' permission)</li>
      <li>Started using mutation observers to watch for changes in player size as well.</li>
      <li>Mutation observers are now used to detect both video and player size changes.</li>
      <li>Settings patching has been reworked. Settings can now be patched incrementally.</li>
    </ul>
    <p>I'm also laying ground for some features that will make my life easier:</p>
    <ul>
      <li>Reworked how logging works internally, but this point still needs some work.</li>
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
