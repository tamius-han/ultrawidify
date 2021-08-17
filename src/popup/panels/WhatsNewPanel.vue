<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.0.7</p>
    <ul>
      <li>
        Youtube: Videos of square-ish aspect ratios on 1440p (and lower) resolutions now no longer get misaligned (<a href="https://github.com/tamius-han/ultrawidify/issues/162">#162</a>)
      </li>
      <li>
        Youtube: Alignment of featured videos on the channel page should now also be fixed
      </li>
    </ul>
    <p>
      Hopefully that didn't break anything because I remember going from query selectors to auto mode for a reason, but when I tested things, things seemed to work across the board.
    </p>
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
