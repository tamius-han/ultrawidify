<template>
  <p class="mb-4">Full changelog for older versions <a href="https://github.com/tamius-han/ultrawidify/blob/master/CHANGELOG.md" target="_blank">is available here</a>.</p>

  <p>Changes in version <b class="font-semibold text-primary-400">7.0.0</b>:</p>

  <p><small>Yes, I reckon this is enough to warrant upping the <a href="https://mastodon.online/@nikitonsky/113691789641950263" target="_blank">proud number</a>.</small></p>

  <b class="text-white">Potentially breaking:</b>
  <ul>
    <li>
      De-spaghettified the part of the settings that controls whether extension runs on a given site or not.<br/>
      <small>NOTE — "Don't fix what ain't broken" only applies when the thing that keeps it working is NOT merely
      a few patches of questionably applied silvertape.</small>
    </li>
  </ul>

  <b class="text-white">Autodetection:</b>
  <ul>
    <li>Autodetection can be set to stop after first aspect ratio detection, or after a period of no changes.</li>
    <li>
      There's new autodetection algorithm. Aims of this algorithm were:<br/>
      <ol>
        <li>use hardware-accelerated webgl canvas</li>
        <li>channel logos should be ignored when computing aspect ratio</li>
        <li>detect subtitles that are hard-coded in the video stream</li>
        <li>
          maybe try to suppress cropping on videos from powerpoint youtubers like Perun, Asianometry,
          or other channels known for using computer graphics with dark backgrounds like 3b1b
        </li>
      </ol>
      <br/>
      If the new algorithm causes more problems than the old one, please consider reporting said issues
      <a href="https://github.com/tamius-han/ultrawidify/issues/291" target="_blank">in this thread</a> on Github.
      When you're reporting a problem, please provide a link to the video, the timestamp where the issue occurs,
      and whether the false crop triggers consistently.<br/>
      For the time being, you can also head over to settings and revert to the legacy autodetection algorithm if needed.
    </li>
  </ul>

  <b class="text-white">New mouse control options</b>
  <ul>
    <li>Manual panning is back. Hold shift and move mouse over the video to pan. In settings, this feature may be swapped to 'CTRL', 'CTRL + SHIFT', or turned off.</li>
    <li>It is now possible to zoom the video with SHIFT + scroll.</li>
  </ul>

  <b class="text-white">UI</b>
  <ul>
    <li>In-player UI can now appear in full-screen for websites that put players into top layer (allegedly).</li>
    <li>
      Keyboard shortcut settings have been split from UI settings, and are now presented in list form on the settings page.
    </li>
    <li>
      Re-design of settings page.
    </li>
    <li>
      Settings, popup and in-page UI have been combined into a single HTML file in order to cut down on the file size.
    </li>
    <li>
      In-player UI has been made a bit lighter (previously, in-player UI utilized vue + iframe. Now, in-player UI uses vanilla HTML/javascript (until you open settings window)).
    </li>
    <li>
      Removed some UI activation options: UI can no longer be activated by defining a trigger zone.
    </li>
    <li>
      Added new UI activation options: UI can be set to show on mouse movement, when mouse moves within user-defined distance to the menu activator, or on CTRL + mouse move (you need to move your mouse while holding CTRL for the menu to show; default for new installs)
    </li>
    <li>
      In-player menu position can be somewhat customized.
    </li>
    <li>
      Default crop mode can now use zoom options as well (previously, it could only use crop options).
    </li>
  </ul>

  <b class="text-white">Other updates and fixes:</b>
  <ul>
    <li>Embedded sites now inherit settings of the parent frame. <small>However, this hasn't been tested for all edge cases and may contain bugs.</small></li>
    <li>Added validation to custom aspect ratio entry menu. Corrected parsing of aspect ratios given in the X:Y format, even though aspect ratios should be ideally given as a single number.</li>
  </ul>

</template>
<script>
import BrowserDetect from '@src/ext/conf/BrowserDetect';

export default({
  props: [
    'settings'
  ],
  data() {
    return {
      BrowserDetect: BrowserDetect,
      // reminder — webextension-polyfill doesn't seem to work in vue!
      addonVersion: BrowserDetect.firefox ? chrome.runtime.getManifest().version : chrome.runtime.getManifest().version,
      addonSource: BrowserDetect.processEnvVersion,
      mailtoLink: '',
      redditLink: '',
      showEasterEgg: false,
    }
  },
  mounted() {
    this.settings.active.whatsNewChecked = true;
    this.settings.saveWithoutReload();
  }
});
</script>
<style lang="scss" scoped>
.donate {
  margin: 1rem;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  background-color: #fa6;
  color: #000;
}
</style>
