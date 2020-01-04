<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.3</p>
    This update mostly attempts to fix disney+ (again). Consider commenting <a href="https://github.com/xternal7/ultrawidify/issues/84">on this issue</a> if issues with disney+ persist.
    <ul>
      <li>Fixed conf patch for disney+ (hopefully)</li>
      <li><code>Settings.save()</code> adds missing values to site config when saving extension configuration.</li>
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
