<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.1.1 & 4.1.2</p>
    <ul>
      <li>Disabled extension on gfycat.</li>
      <li>Fix for old.reddit.com applied to www.reddit.com</li>
    </ul>
    <p class="label">4.1.0</p>
    <ul>
      <li>This</li>
      <li>(Experimental) You can specify custom CSS for the page.</li>
      <li>(Experimental) You can manually specify how player element is detected</li>
      <li>Fixed old.reddit and vimeo for that. Disabled extension on imgur by default.</li>
    </ul>
    <p class="label">4.0.0</p>
    <p>
      <ul>
        <li>Fixed the bug where settings wouldn't be saved.</li>
        <li><b>Autodetection improvements:</b><ul>
          <li>Implemented gradient detection. Changing aspect ratio will only happen if hard edge is detected</li>
          <li>Improved black frame detection. Some (but not all) issues about autodetection triggering on dark frames were resolved</li>
          <li>Increased autodetection frequency from 0.6s to 0.3s. <b>This isn't likely to happen, but if you notice this
             extension using excessive amounts of RAM (2+ GB), this is why. If you experience this issue, please contact me (see 'Report a problem' tab).</b>
          </li>
      </ul></li>
      <li>Settings page for extension added.</li>
      <li>(Experimental) You can define custom keyboard shortcuts in settings. See 'actions' menu.</li>
    </ul>
      For more detailed info, see <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">full changelog</a>.
    </p>
    
  </div>
</template>
<script>
export default {

}
</script>

<style>

</style>
