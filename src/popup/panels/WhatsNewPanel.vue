<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.3.0</p>
    This update mostly contains things that have the potential to make my life easier when solving issues.
    <ul>
      <li>User-friendly way of importing-exporting settings (exporting settings requires 'download' permission)</li>
      <li>Reworked logging (basic). Logging can be enabled at runtime and and logs saved to a file. (Saving logs requires 'download' permission)</li>
      <li>Some people reported issues with inconsistent video alignment on youtube. While I've not been able to make that bug happen to me,
        (which means I haven't been able to fix it either), reports describe behaviour similar to what was going on with Iridium. Examining
        the Iridium issue revealed an issue that could be potentially blamed for this behaviour. That issue was fixed. Since I've never been able to make this problem
        happen to me, I'm not being able to verify whether that issue is gone. <b>If you're still experiencing issues with inconsistent video alignment,
          please contact me via github, reddit or email.</b> See 'Report a problem' tab for more details.</li>
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
  }
}
</script>

<style>

</style>
