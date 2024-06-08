<template>
  <h1>What's new</h1>
  <p>Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md">is available here</a>.</p>

  <h2>6.0.0</h2>
  <p>
    I don't think I need to write a changelog for this one.
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
    <li>
      Better zooming. The slider is back, baby.
    </li>
    <li>
      Panning option that's a bit more intuitive.
    </li>
  </ul>
  <h3>Unbaked features</h3>
  <ul>
    <li>
      <b>Player UI settings</b>. Ultrawidify doesn't always correctly identify which area the video should fill, especially when not in full screen mode.
      Version 6.0.0 was intended to come with UI that makes it easier for you to "help" ultrawidify by identifying the correct player element. Alas, I was
      busier than expected and manifest v3 deadline came faster than expected.
    </li>
    <li>
      <b>Disabling Ultrawidify UI trigger zone, or otherwise changing target area size and position, is not possible</b>.
    </li>
  </ul>
  <h3>Regressions</h3>
  <ul>
    <li>
      Due to major changes under the hood, custom settings from older versions may not have been migrated.
    </li>
    <li>
      It is unclear how extension acts on sites with more than one video.
    </li>
    <li>
      Extension lost the ability to discriminate between iframes. Actions taken through the popup will be affect <b>all</b> iframes.
    </li>
  </ul>

</template>
<script>
</script>
