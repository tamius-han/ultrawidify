<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.0.0</p>
    <ul>
      <li>
        Under the hood: the extension has been moved over to typescript (except UI bits, which remain javascript).
      </li>
      <li>
        webextension-polyfill is now used everywhere (if only because typescript throws a hissy fit with <code>browser</code> and <code>chrome</code> otherwise) (<a href="https://github.com/tamius-han/ultrawidify/issues/114">#114</a>). 
      </li>
      <li>
        Fix some bugs that I didn't even know I had, but typescript kinda shone some light on them
      </li>
      <li>
        Manual zoom and panning are now back. (<a href="https://github.com/tamius-han/ultrawidify/issues/135">#135</a> and <a href="https://github.com/tamius-han/ultrawidify/issues/138">#138</a>)
      </li>
      <li>
        Fix issue when video would be scaled incorrectly if video element uses <code>height:auto</code>.
      </li>
      <li>
        <b>[5.0.0.1]</b> Fixed the issue where settings were reset on page load.
      </li>
      <li>
        <b>[5.0.0.1]</b> Fixed the issue where settings page wouldn't load.
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
