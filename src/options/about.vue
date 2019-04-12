<template>
  <div>
    <h2>Ultrawidify - an aspect ratio fixer for youtube <small>(and netflix and various other sites)</small></h2>
      <p>Ultrawidify version: {{addonVersion}}. Created by Tamius Han (me).</p>
      <p><b>Having an issue?</b> Report <strike>undocumented features</strike> bugs using one of the following options:
        <ul>
          <li> <a target="_blank" href="https://github.com/xternal7/ultrawidify/issues"><b>Github</b></a> <b>(strongly preferred)</b><br/></li>
          <li>PM me on <a target="_blank" href="https://www.reddit.com/message/compose?to=xternal7&subject=[Ultrawidify]%20ENTER%20SUMMARY%20OF%20YOUR%20PROBLEM%20HERE&message=Describe+your+issue+in+more+detail.+Don%27t+forget+to+include%3A%0D%0A%2A+Extension+version%0D%0A%2A+Browser%0D%0A%2A+Operating+system%0D%0A%2A+Other+extensions+that+could+possibly+interfere%0D%0A%0D%0AIf+you%27re+reporting+an+issue+with+automatic+aspect+ratio+detection%2C+please+also+include+the+following+%28if+possible%29%3A%0D%0A%2A+model+and+make+of+your+CPU%0D%0A%2A+amount+of+RAM">reddit</a><br/></li>
          <li>Email: <a target="_blank" href="mailto:tamius.han@gmail.com?subject=%5BUltrawidify%5D+ENTER+SUMMARY+OF+YOUR+ISSUE+HERE&body=Describe+your+issue+in+more+detail.+Don%27t+forget+to+include%3A%0D%0A%2A+Extension+version%0D%0A%2A+Browser%0D%0A%2A+Operating+system%0D%0A%2A+Other+extensions+that+could+possibly+interfere%0D%0A%0D%0AIf+you%27re+reporting+an+issue+with+automatic+aspect+ratio+detection%2C+please+also+include+the+following+%28if+possible%29%3A%0D%0A%2A+model+and+make+of+your+CPU%0D%0A%2A+amount+of+RAM">tamius.han@gmail.com</a></li>
          </ul>
      </p>

    <p>&nbsp;</p>

    <p>If you're curious about the source code, <a href="https://github.com/xternal7/ultrawidify">github's here</a>. It's available under sorta-you-can-look-but-you-can't-touch licence, meaning: you can look, I won't mind if you shoot me a pull request, but I will mind if you're just gonna reupload this extension to the AMO/Chrome store.</p>
    <p>If you're looking at this page because you're bored and want to be bored some more, <a href="https://tamius.net">my website's here</a> and <a href="https://stuff.tamius.net/sacred-texts/">my blog is here</a>.</p>
    <p>I already have a 'donation' tab, but if you want to buy me a beer, <a href="https://paypal.me/tamius">my paypal's here</a>.</p>
    <h2>Plans for the future</h2>
    <p>Improving automatic detection, trying to re-implement in-player user interface (confirmed!), fixing bugs. Maybe even give the settings page a facelift.</p>
    <h2>Acknowledgements</h2>
    <p>This extension uses font <a href="http://overpassfont.org/">Overpass</a> and everything <a href="https://github.com/Kocal/vue-web-extension">this Vue template brings along</a>.</p> 

    <h2>Special thanks to</h2>
    <ul>
      <li>Everyone who reports bugs</li>
      <li>Everyone who waited for about 6-8 months for the 4.0 release. It was supposed to be released by the end of December 2018, we're in April. It was a major rewrite, though.</li>
      <li>Everyone who donated at any point in time.</li>
      <li>me for making this extension. You're welcome.</li>
    </ul>
  </div>
</template>


<script>
export default {
  data() {
    return {
      addonVersion: browser.runtime.getManifest().version || chrome.runtime.getManifest().version,
    }
  }
}
</script>