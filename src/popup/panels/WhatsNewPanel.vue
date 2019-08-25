<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.3.0</p>
    This update mostly contains things that have the potential to make my life easier when solving issues.
    <ul>
      <li>User-friendly way of importing-exporting settings (exporting settings requires 'download' permission)</li>
      <li>Reworked logging (basic). Logging can be enabled at runtime and and logs saved to a file. (Saving logs requires 'download' permission)</li>
      <li>Started using mutation observers to watch for changes in player size as well.</li>
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
