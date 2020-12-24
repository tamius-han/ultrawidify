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
        Fullscreen videos on streamable are aligned correctly (<a href="https://github.com/tamius-han/ultrawidify/issues/118">#116</a>). Note that while this fix hasn't broken any sites I have access to and know of,
        there is a small possibility that this bugfix may break something somewhere. If this happens on a site you use, please notify me via github, email or PM me on reddit.
      </li>
      <li>
        Edge users using CWS version of the extension get a very aggressive warning when trying to use the extension with Edge
      </li>
      <li>
        <b>[4.5.1.1]</b> Streamable fix broke old.reddit + RES on embeds from v.redd.it and streamable.com. We're now using an alternative implementation. (<a href="https://github.com/tamius-han/ultrawidify/issues/128">#128</a>)
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
