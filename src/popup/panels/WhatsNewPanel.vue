<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.10</p>
    <ul>
      <li>
        Video alignment should now work on Twitch (<a href="https://github.com/tamius-han/ultrawidify/issues/109">#109</a>)
      </li>
      <li>
        Videos should now align properly on Hulu while cropped (<a href="https://github.com/tamius-han/ultrawidify/issues/111">#111 &amp; via email</a>)
      </li>
      <li>
        Fixed a problem where changing certain settings would cause multiple instances of Ultrawidify to run on a page, effectively preventing some crop options to be set until reload. (possibly <a href="(https://github.com/tamius-han/ultrawidify/issues/112">#112</a>?)
      </li>
       <li>
        Fixed a problem where embedded videos would be misaligned after switching from full screen
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
