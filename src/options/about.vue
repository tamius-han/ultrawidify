<template>
  <div>
    <h2>Ultrawidify - an aspect ratio fixer for youtube <small>(and netflix and various other sites)</small></h2>
      <p>Ultrawidify version: {{addonVersion}}. Created by Tamius Han (me).</p>
      <p><b>Having an issue?</b> Report <strike>undocumented features</strike> bugs using one of the following options:
        <ul>
          <li> <a target="_blank" href="https://github.com/tamius-han/ultrawidify/issues"><b>Github</b></a> <b>(strongly preferred)</b><br/></li>
          <li>Email: <a target="_blank" :href="mailtoLink">tamius.han@gmail.com</a></li>
          <li>PM me on <a target="_blank" :href="redditLink">reddit</a><br/></li>
          </ul>
      </p>

    <p>&nbsp;</p>

    <p>If you're curious about the source code, <a href="https://github.com/tamius-han/ultrawidify">github's here</a>. It's available under sorta-you-can-look-but-you-can't-touch licence, meaning: you can look, I won't mind if you shoot me a pull request, but I will mind if you're just gonna reupload this extension to the AMO/Chrome store.</p>
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
import BrowserDetect from '../ext/conf/BrowserDetect';
import Settings from '../ext/lib/Settings';

export default {
  data() {
    return {
      addonVersion: '[extension version not loaded. This is a bug.]',
      mailtoLink: 'mailto:tamius.han+ultrawidify@gmail.com',
      redditLink: '',
    }
  },
  created() {
    this.addonVersion = Settings.getExtensionVersion();

    const messageTemplate = encodeURIComponent(
`Describe your issue in more detail. In case of misaligned videos, please provide screenshots. When reporting\
 issues with autodetection not detecting aspect ratio correctly, please provide a link with timestamp to the\
 problematic video at the time where the problem happens. You may delete this paragraph, as it's only a template.


Extension info (do not change or remove):
* Extension version: ${this.addonVersion}
* Browser (env): ${BrowserDetect.processEnvBrowser}

Browser-related stuff (please ensure this section is correct):
* User Agent string: ${window.navigator.userAgent}
* vendor: ${window.navigator.vendor}
* Operating system: ${window.navigator.platform}
`
      );
    this.mailtoLink = `mailto:tamius.han@gmail.com?subject=%5BUltrawidify%5D%20ENTER%20SUMMARY%20OF%20YOUR%20ISSUE%20HERE&body=${messageTemplate}`;
    this.redditLink = `https://www.reddit.com/message/compose?to=xternal7&subject=[Ultrawidify]%20ENTER%20SUMMARY%20OF%20YOUR%20PROBLEM%20HERE&message=${messageTemplate}`;
  }
}
</script>