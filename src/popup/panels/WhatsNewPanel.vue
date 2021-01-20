<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">4.5.2</p>
    <ul>
      <li>
        Fixed the issue where videos would sometimes get misaligned while using hybrid stretch, except for real this time. (<a href="https://github.com/tamius-han/ultrawidify/issues/125">#125</a>)
      </li>
      <li>
        Improved DRM detection (the 'autodetection cannot work on this site' popup should now no longer show up on the sites where autodetection <i>can</i> work)
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
