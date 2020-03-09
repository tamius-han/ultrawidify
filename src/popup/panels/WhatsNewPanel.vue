<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.6</p>
    <ul>
      <li>Ensured that Vue part of the content script (logger UI) only loads when necessary in order to fix breakage on certain sites (<a href="https://github.com/tamius-han/ultrawidify/issues/96">#96</a>).</li>
      <li>Disabling (or enabling, if running in whitelist-only mode) specific sites used to not work (<a href="https://github.com/tamius-han/ultrawidify/issues/91">#91</a>). This issue appears to have been fixed.</li>
      <li>Default stretch mode for sites is now probably being observed, too (<a href="https://github.com/tamius-han/ultrawidify/issues/94">#94</a>).</li>
      <li>Fixed netflix (and possibly disney+ — please provide feedback for disney+ as I am unable to test it due to regional restrictions)</li>
    </ul>

    <template v-if="BrowserDetect.chrome">
      <p>Due to factors beyond my control, Chrome version of this extension has missed the last three patches.</p>

      <ul>
        <li><b>4.4.5</b>
        <ul>
          <li>Extension no longer requires <code>allTabs</code> and <code>webNavigation</code> permissions</li>
          <li>Some CSS on the logger popup was not scoped, causing display issues with some sites (<a href="https://github.com/tamius-han/ultrawidify/issues/92">#92</a>)</li>
          <li>Fix some additional issues with video alignment when changing videos on autoplay</li>
        </ul></li>
        <li><b>4.4.4<small>.1, .2</small></b>
        <ul>
          <li><b>[4.4.4.1]</b> There were multiple reports about popup being broken. This issue should be resolved.</li>
          <li><b>[4.4.4.1]</b> Setting global/site defaults should no longer require page reloads.</li>
          <li><b>[4.4.4.2]</b> Fix problem with video being offset while switching between full screen and non-fullscreen non-theater mode on Youtube</li>
        </ul></li>
      </ul>
    </template>
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
