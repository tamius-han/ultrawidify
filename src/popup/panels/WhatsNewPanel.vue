<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.5.1</p>
    <ul>
      <li>Fixed the misalignment issue on netflix ... hopefully.</li>
      <li>
        'Site settings' tab should now work in Chrome as well (<a href="https://github.com/tamius-han/ultrawidify/issues/126">#126</a>)
      </li>
      <li>
        Popup interface now refreshes properly (<a href="https://github.com/tamius-han/ultrawidify/issues/127">#127</a>)
      </li>
      <li>
        Videos should now be scaled correctly when the display is narrower than video's native aspect ratio (<a href="https://github.com/tamius-han/ultrawidify/issues/118">#118</a>)
      </li>
      <li>
        Edge users using CWS version of the extension get a very aggressive warning when trying to use the extension with Edge
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
