<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.5.0</p>
    <ul>
      <li>
        Under the hood: migrated from vue2 to vue3, because optional chaining in templates is too OP.
      </li>
      <li>
        (On options page, section 'Action &amp; shortcuts') Manual aspect ratio now supports entering custom ratios using '21/9' and '2.39:1' formats (as opposed to single number, e.g. '2.39') — <a href="https://github.com/tamius-han/ultrawidify/issues/121">#121</a>.
      </li>
      <li>
        Added config for wakanim.tv (special thanks to <a href="https://github.com/saschanaz">@saschanaz</a> for doing the legwork — <a href="https://github.com/tamius-han/ultrawidify/issues/113">#113</a>)
      </li>
      <li>
        (In Firefox) When extension was placed in overflow menu, the popup was cut off. That should be fixed now. (<a href="https://github.com/tamius-han/ultrawidify/issues/119">#119</a>)
      </li>
      <li>
        The extension will now show a notification when autodetection can't run due to DRM.
      </li>
      <li>
        Videos on facebook and reddit no longer get shifted up and to the left for me (cropping most of the video off-screen), but I haven't been
        deliberately trying to fix that issue. If you experience that issue, please consider contacting me (via github or email) with a link to a
        problematic video.
      </li>
      <li>
        <b>[4.5.0.1]</b> Fixes for netflix alignment issues.
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
