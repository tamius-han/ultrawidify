<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.1.2</p>
    <ul>
      <li>
        Fixed the issue where "Enable extension (for this site)" option was not visible in the extension popup.
      </li>
      <li>
        Blackframe tests now run on same data as main algorithm as opposed on a smaller sample (<code>drawImage()</code> calls are <i>very</i> expensive even for a 16x9 sample).
      </li>
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
