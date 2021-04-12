<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.0.2</p>
    <ul>
      <li>
        When in full screen, the extension will assume player element dimensions are the same as the screen resolution. This should help with sites where ultrawidify doesn't correctly identify the player, as cropping generally doesn't work if player element is not identified. Old behaviour can be restored in advanced extension settings by toggling the "use player aspect ratio in fullscreen" checkbox under 'player detection settings'. 
      </li>
      <li>
        Fixed the issue where player wouldn't get detected if video was wider than the player.
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
