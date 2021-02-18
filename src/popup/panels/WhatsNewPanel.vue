<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.5.3</p>
    <ul>
      <li>
        Provided a workaround for the fullscreen stretching bug Chrome 88 (or a recent Windows 10 update) introduced for nVidia users using hardware acceleration on Windows 10. In order to mitigate this bug, Ultrawidify needs to keep a 5-10 px wide black border while watching videos in full screen. This bug is also present in Edge.
      </li>
      <li>
        <b>[4.5.3.1]</b> Fixed binding for letterbox misalignment treshold binding in settings.
      </li>
      <li>
        <b>[4.5.3.2]</b> Removed false positive "this extension can't work due to DRM" notifications.
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
