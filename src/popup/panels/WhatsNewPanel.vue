<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.0.5</p>
    <ul>
      <li>
        In 'Advanced Settings' tab of the popup: Player Detection Settings are now a bit less of a mess.
      </li>
      <li>
        Fixed the background issue with app.plex.tv (<a href="https://github.com/tamius-han/ultrawidify/issues/158" target="_blank">#158</a>).<br/>
        <small><b>NOTE:</b> if you're using self-hosted plex, you will have to configure the extension for flex yourself. Refer to the <a href="https://github.com/tamius-han/ultrawidify/issues/158" target="_blank">github issue</a> for details.</small>
      </li>
    </ul>
    <p>
      <small><b>NOTE from older versions:</b> zoom limitations were introduced as a workaround for a bug caused by Chrome's/Edge's faulty hardware acceleration. Yes I know this message has been here since march, but nothing has changed.</small>
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
