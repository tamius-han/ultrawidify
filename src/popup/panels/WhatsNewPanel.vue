<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.9</p>
    <ul>
      <li>
        Fixed issue with video alignment on youtube under certain conditions (previously fixed in v4.4.7.1-2), but this time for real (hopefully). 
      </li>
      <li>
        Fixed the bug where extension wouldn't work when URL specified a port (e.g. www.example.com:80)
      </li>
      <li>
        <b>[4.4.9.1]</b>removed source files from extension build
      </li>
    </ul>
    <p>
      In addition to that, as of 4.4.9.1 the build process ensures removal of `node_modules` before building the extension so we can have
      reproducible builds except for real this time. Hopefully.
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
