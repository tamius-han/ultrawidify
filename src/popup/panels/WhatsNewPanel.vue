<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.0</p>
    <ul>
      <li>Russian users (and users of other non-latin keyboard layouts) can now use keyboard shortcuts by default, 
          without having to rebind them manually. <b>NOTE: this change will only be applied to users who have <i>NOT</i>
          modified their keyboard shortcuts.</b></li>
      <li>NOTE: when using non-latin layouts, 'zoom' shortcut (`z` by default) uses the position of 'Y' on QWERTY layout.</li>
      <li>Ability to preserve aspect ratio between different videos (applies to current page and doesn't survive proper 
          page reloads)</li>
      <li>Changing aspect ratio now resets zooming and panning.</li>
      <li>Fixed bug where keyboard shortcuts would work while typing in certain text fields</li>
      <li>Fixed a minor bug with autodetection</li>
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
