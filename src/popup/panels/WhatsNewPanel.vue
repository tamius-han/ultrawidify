<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.0.6</p>
    <ul>
      <li>
        Added configuration for metaivi.com based on user feedback (<a href="https://github.com/tamius-han/ultrawidify/issues/160" target="_blank">#160</a>).<br/>
      </li>
    </ul>
    <p><small>
      <b>Known issues:</b> zooming is limited in Chromium-based browsers. This is a browser bug that no extension can fix. See <a href="https://github.com/tamius-han/ultrawidify/discussions/161" target="_blank">this</a> for more info.
    </small></p>
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
