<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.5</p>
    <ul>
      <li>Extension no longer requires <code>allTabs</code> and <code>webNavigation</code> permissions</li>
      <li>Some CSS on the logger popup was not scoped, causing display issues with some sites (<a href="https://github.com/tamius-han/ultrawidify/issues/92">#92</a>)</li>
      <li>Fix some additional issues with video alignment when changing videos on autoplay</li>
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
