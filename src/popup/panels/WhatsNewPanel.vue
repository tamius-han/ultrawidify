<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.7</p>
    <ul>
      <li><b>[4.4.7.1]</b> CSS fixes</li>
      <li><b>[4.4.7.1~2]</b> Delay CSS changes if video dimensions are invalid (attempt to fix youtube alignment problems
      that appear in certain circumstances). 4.4.7.2 increased number of retries.
      </li>
      <li>Removed unnecessary font files and image files from the package.</li>
      <li>(For testing/debugging purposes) Logger UI in swatter mode is now somewhat functional and user-friendly.</li>
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
