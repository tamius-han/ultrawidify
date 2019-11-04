<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/xternal7/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.4.1</p>
    <ul>
      <li>Changes to player detection that fix issues with vk</li>
      <li>Extension tries to avoid setting aspect ratio pointlessly</li>
      <li>Fixed (hopefully) mailto: and reddit compose links.</li>
      <li>When reporting bugs, email/reddit template now automatically gathers browser, extension version and OS.</li>
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
