<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.0.3</p>
    <ul>
      <li>
        Fixed the issue where the videos were sometimes offset up and left. Again.
      </li>
      <li>
        Fix the issue where correcting source stretch was squished incorrectly (<a href="https://github.com/tamius-han/ultrawidify/issues/153">#153</a>)
      </li>
    </ul>
    <p>
      <small><b>NOTE:</b> zoom limitations were introduced as a workaround for a bug caused by Chrome's/Edge's faulty hardware acceleration
      which caused videos to be incorrectly stretched on nVidia GPUs while in fullscreen. While this issue is reportedly fixed as
      of few weeks ago, a few people reported having this issue within the past two weeks.</small>
    </p>
    <p>
      <small>If you experience issues with videos being stretched incorrectly at certain zoom levels, go to:</small><br/>
      <small><code>extension popup > Advanced Settings > Browser quirk mitigations > limit zoom.</code></small>
    </p>
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
