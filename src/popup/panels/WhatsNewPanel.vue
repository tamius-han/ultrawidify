<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">5.1.1</p>
    <p>
      In last patch notes:
    </p>
    <pre>
> Hopefully that didn't break anything too much
    </pre>
    <p>
      Well, about that ...
    </p>
    <ul>
      <li>
        Fixed the problem where autodetection wouldn't work for most people that aren't me.
      </li>
    </ul>
    <p><small>
      <b>Known issues:</b> zooming is limited in Chromium-based browsers. This is a browser bug that no extension can fix. Technical details about this can be found <a href="https://stuff.tamius.net/sacred-texts/2021/08/19/ultrawidify-and-chrome-2021-edition-episode-2/" target="_blank">on my blog.</a>.
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
