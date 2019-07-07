<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.2.0 and 4.2.1</p>
    <ul>
      <li>Fixed the issue where user-defined CSS didn't get applied to websites. Issue mainly affected vimeo.</li>
      <li>Slightly improved popup design. (Design change suggested by PortaTrekos)</li>
      <li>Improved site settings control in extension popup. It's possible to enable extension for previously disabled embedded sites.</li>
      <li>Improved incompatibilities with reddit, where videos would be vertically misaligned when not using RES</li>
      <li>Fixed imcompatibilities with Iridium. Flicker when clicking play/pause or switching between big and popup player is caused by either Youtube or Iridium trying to apply their styles over mine.</li>
      <li>Youtube, reddit and twitch players are now determined by a query string (instead of less accurate automatic detection)</li>
      <li>Some people reported issues with inconsistent video alignment on youtube. While I've not been able to make that bug happen to me,
        (which means I haven't been able to fix it either), reports describe behaviour similar to what was going on with Iridium. Examining
        the Iridium issue revealed an issue that could be potentially blamed for this behaviour. That issue was fixed. Since I've never been able to make this problem
        happen to me, I'm not being able to verify whether that issue is gone. <b>If you're still experiencing issues with inconsistent video alignment,
          please contact me via github, reddit or email.</b> See 'Report a problem' tab for more details.</li>
    </ul>

    
  </div>
</template>
<script>
export default {

}
</script>

<style>

</style>
