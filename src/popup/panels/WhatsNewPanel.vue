<template>
  <div>
    <h2>What's new</h2>
    <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>
    <p class="label">6.0.0</p>
    <ul>
      <li>Fixed some problems with autodetection sometimes briefly resetting on dark frames (<a href="https://github.com/tamius-han/ultrawidify/issues/195" target="_blank">#195</a>), <a href="https://github.com/tamius-han/ultrawidify/issues/196" target="_blank">#196</a>)</li>
    </ul>
    <p class="label">5.1.2</p>
    <ul>
      <li>
        <b>In-player UI.</b><br/>
        This one took major effort to pull off. Required some changes under the hood, required me to de-spaghettify some code. The UI will only show
        if the video takes up sufficient amount of space (currently determined as 960 pixels wide).
      </li>
      <li>
        By default, Ultrawidify will not kick in on "small videos". You have to be either in full screen or theater mode. Ultrawidify assumes that any
        video that takes up more than 85% of the window width is being viewed in theater mode. This value may be tweaked later on. This feature can be
        configured (or turned off entirely) via 'Advanced options' menu on the in-player UI.
      </li>
      <li>
        The in-player extension UI will do a better job differentiating between the various level of support: "official" for the sites that Tam can check
        on his own, "fingers crossed" for sites that Tam can't check because my load-bearing credit card can't support the weight of a dozen subscription
        services, and "community support" for sites that enjoy support through the helping hand of people willing to help.
      </li>
      <li>
        The in-player UI now displays a warning whenever Ultrawidify detects automatic aspect ratio detection isn't happening because the site uses DRM.
      </li>
      <li>
        Made the UI for fixing problems with Ultrawidify not working a bit more intuitive.
      </li>
      <li>
        Better zooming. The slider is back, baby.
      </li>
      <li>
        New alignment options. Video can be aligned vertically as well as horizontally.
      </li>
      <li>
        Panning option that's a bit more intuitive.
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
