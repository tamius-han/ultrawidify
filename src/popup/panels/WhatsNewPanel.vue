<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.8</p>
    <ul>
      <li>
        Fixed the bug where on pages with more than one video, the list of available videos in the extension popup
        wouldn't remove videos that are no longer displayed on site. This resulted in extension listing videos that
        were no longer on the page. Reboot or navigation would also not clear the list if navigating between various
        pages on the same host.
      </li>
      <li>
        Fixed the chrome-only bug where on sites with more than one video, the number wouldn't get hidden when the
        extension popup closed.
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
