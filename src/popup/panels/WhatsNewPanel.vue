<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.0.4</p>
    <ul>
      <li>
        Updated config for disney+. Hopefully it works now. Special thanks to <a href="https://github.com/tamius-han/ultrawidify/issues/84#issuecomment-846334005" target="_blank">@jwannebo</a>.
      </li>
    </ul>
    <p>
      <small><b>NOTE from older versions:</b> zoom limitations were introduced as a workaround for a bug caused by Chrome's/Edge's faulty hardware acceleration.</small>
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
