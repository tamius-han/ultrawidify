<template>
  <div class="flex flex-col w-full h-full gap-2">
    <div class="flex flex-row gap-2 bg-black">
      <div class="w-[1/2]" style="width: 50%">
        <h1>What's new</h1>
        <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md" target="_blank">is available here</a>.</p>

        <h2>6.2.0</h2>
        <p>
          There's been another major change that skips a version.
        </p>
        <ul>
          <li>Parts of automatic aspect ratio detection use WebGL now. This should result in improved performance. Slightly underwhelming blog post about this issue can be found <a href="https://stuff.tamius.net/sacred-texts/2024/10/02/hot-dang-i-shouldnt-have-given-on-webgl/" target="_blank">here</a>.</li>
          <li>In-player UI now indicates whether a site is having a problem with automatic aspect ratio detection.</li>
          <li>UI improvements</li>
        </ul>
        <p>
          Since automatic aspect ratio detection had to be rewritten completely and since the new version needs to be out 5 days ago, there are some regressions in the automatic aspect ratio detection.
        </p>

        <h2>6.0.1</h2>
        <p>Fixed external links.</p>

        <h2>6.0.0</h2>
        <p>
          I don't think I need to write a changelog for this one. I've also been working on this, on and (mostly) off, for ... a long time, so I might have "kinda forgot" some minor things.
        </p>
        <ul>
          <li><b>Manifest v3</b>. Bit late, but still.</li>
          <li>
            <b>In-player UI.</b><br/>
            This one took major effort to pull off. Required some changes under the hood, required me to de-spaghettify some code. The UI will only show
            if the video takes up sufficient amount of space (currently determined as 960 pixels wide).
          </li>
          <li>
            <b>New alignment options.</b> Video can be aligned vertically as well as horizontally.
          </li>
          <!-- <li>
            By default, Ultrawidify will not kick in on "small videos". You have to be either in full screen or theater mode. Ultrawidify assumes that any
            video that takes up more than 85% of the window width is being viewed in theater mode. This value may be tweaked later on. This feature can be
            configured (or turned off entirely) via 'Advanced options' menu on the in-player UI.
          </li> -->
          <li>
            The in-player extension UI will do a better job differentiating between the various level of support: "official" for the sites that Tam can check
            on his own, "fingers crossed" for sites that Tam can't check because my load-bearing credit card can't support the weight of a dozen subscription
            services, and "community support" for sites that enjoy support through the helping hand of people willing to help.
          </li>
          <li>
            The in-player UI should now display a warning whenever Ultrawidify detects automatic aspect ratio detection isn't happening because the site uses DRM.
          </li>
          <!-- <li>
            Better zooming. The slider is back, baby.
          </li> -->
          <!-- <li>
            Panning option that's a bit more intuitive.
          </li> -->
        </ul>
        <h3>Regressions</h3>
        <ul>
          <li>
            Due to major changes under the hood, custom settings from older versions were NOT been migrated (probably).
          </li>
          <li>
            It is unclear how extension acts on sites with more than one video.
          </li>
          <li>
            Extension lost the ability to discriminate between iframes. Actions taken through the popup will be affect <b>all</b> iframes.
          </li>
          <li>
            Hope the UI is worth the regressions, because getting UI to work has been a MAJOR pain in the ass.
          </li>
        </ul>
      </div>
      <div class="w-[1/2]" style="width: 50%; padding-left: 1rem; padding-top: 5rem;">
        <h2>Thank you monies</h2>
        <p>
          If you think I deserve money for the work I did up to this point, you can bankroll my caffeine addiction.
        </p>
        <p class="text-center">
          <a class="donate" href="https://www.paypal.com/paypalme/tamius" target="_blank">Donate on Paypal</a>
        </p>

      </div>
    </div>
  </div>
</template>
<script>

export default({
  props: [
    'settings'
  ],
  mounted() {
    this.settings.active.whatsNewChecked = true;
    this.settings.saveWithoutReload();
  }
});
</script>
<style lang="scss" scoped>
.flex {
  display: flex;
}
.flex-row {
  flex-direction: row;
}

p, li {
  font-size: 1rem;
}
small {
  opacity: 0.5;
  font-size: 0.8em;
}
a {
  color: #fa6;
}
.text-center {
  text-align: center;
}
.donate {
  margin: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background-color: #fa6;
  color: #000;
}
</style>
