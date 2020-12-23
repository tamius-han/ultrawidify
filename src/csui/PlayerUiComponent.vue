<template>
  <div v-if="uiVisible" class="uw-hover uv-hover-trigger-region">
    <div class="flex flex-row pad">
      <div class="text panel">
        <h1>Microsoft Edge's DRM implementation is too broken for this extension to work on this site</h1>
        <p><sup>2020-12-22</sup></p>
        <p>
          In October 2020, Microsoft Edge received an update that renders video playback completely broken on sites that utilize DRM. This extension relies on the browser implementing functional video playback,
          which means that this extension currently cannot work in Edge on sites that utilize DRM (and neither can other 21:9 extensions).
        </p>
        <p>
          <b>Using this extension (and its alternatives) on this site may make things worse</b> — even if you only set aspect ratio manually.
        </p>
        <p>
          I have attempted all possible workarounds and none of them work.
        </p>
        <p><small>Yes I do recognize the irony of getting pissed at Microsoft for their bugs while my extension is basically the Skyrim of CWS, but guys at Microsoft are getting paid for working on MS Edge and I'm not getting paid for writing this extension.</small></p>
        <p>
          <b>I am not keeping up with Edge updates as I primarily use Firefox and Chrome. If Edge has already fixed their broken video implementation,
            please open an issue on <a href="https://github.com/tamius-han/ultrawidify/issues" target="_blank">github</a>, <a href="mailto:tamius.han@gmail.com" target="_blank">shoot me an email</a> or
            <a href="https://www.reddit.com/message/compose?to=xternal7" target="_blank">PM me on reddit</a>. Please include this string in the message:
          </b>
        </p>
        <p>
          <i>{{userAgent}}</i>
        </p>
        <p>
           <b>Your help is much appreciated.</b>
        </p>
        <p>&nbsp;</p>
        <p>
          Further reading: <a href="https://stuff.tamius.net/sacred-texts/2020/12/22/ultrawidify-and-edge-2020-edition/" target="_blank">blog post with extra details</a>.
        </p>
        <p>
          I know better than you: <b><a @click="uiVisible=false">hide this popup</a></b>
        </p>
        <p>
          In order to disable this popup forever, open the ultrawidify popup, click on 'site settings' and disable automatic aspect ratio detection for this site.
          You should probably even disable the extension for this site altogether for the time being.
        </p>
        <p>
          <br/>
          <br/>
          <br/>
          <br/>
        </p>
        <h3>Help by reporting this issue to Microsoft</h3>
        <p><b>Go to the settings menu</b> <small>(upper right corner of the window, three dots)</small> <b>→ Help and feedback</b> <small>(second option from the bottom)</small> <b>→ Send feedback.</b> (Alternatively, press Alt + Shift + I)</p>
        <p>Enter this in the first box:</p>
        <p>
          <br/>
          <i>
            Videos on sites that utilize DRM protection schemes are not being scaled correctly. If a part of a DRM-protected video is being displayed outside the boundaries of the browser window, 
            Edge will scale the video to only fit the portion of the video tag that is currently being displayed on the screen, rather than filling the entire video tag. This causes videos appear
            differently than website developers intended at best, and breaking certain websites at worst.
          </i>
          <br/>
        </p>
        <p>Or something along these lines. Click 'send' when you're done.</p>
        <p>Maybe if Edge developer team gets enough reports, they'll fix the problem.</p>
      </div>
      <div class="image-examples panel">
        <p>Follow-up questions</p>
        <h3>How can one tell when Edge has fixed their bugs?</h3>
        <p>
          When 21:9 movies on netflix look like this:
        </p>
        <p>
          <img :src="getUrl('res/img/git-ignore/edge-demo-working.jpg')" />
        </p>
        <p>
          And not like this:
        </p>
        <p>
          <img :src="getUrl('res/img/git-ignore/edge-demo.jpg')" />
        </p>
        <p>&nbsp;</p>
        <p>&nbsp;</p>
        <p>&nbsp;</p>
        <p>&nbsp;</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex';
import Icon from '../common/components/Icon';
import BrowserDetect from '../ext/conf/BrowserDetect';
import Settings from '../ext/lib/Settings';

export default {
  components: {
    Icon,
  },
  data() {
    return {
      uiVisible: true,
      userAgent: window.navigator.userAgent
    };
  },
  computed: {
  },
  watch: {
    showUi(visible) {
      if (visible !== undefined) {
        this.uiVisible = visible;
      }
    }
  },
  methods: {
    getUrl(url) {
      return BrowserDetect.firefox ? browser.runtime.getURL(url) : chrome.runtime.getURL(url);
    },
    async hidePopupForever() {
      const settings = new Settings();
      await settings.init();

      if (!settings.active.mutedNotifications) {
        settings.active.mutedNotifications = {};
      }
      if (!settings.active.mutedNotifications?.browserSpecific) {
        settings.active.mutedNotifications.browserSpecific = {
          edge: {
            brokenDrm: {
            }
          }
        };
      }
      settings.active.mutedNotifications.browserSpecific.edge.brokenDrm[window.location.hostname] = true;

      await settings.saveWithoutReload();
      this.uiVisible = false;
    }
  }
}
</script>

<style lang="scss" src="../res/css/uwui-base.scss"></style>
<style lang="scss" scoped>
@import '../res/css/uwui-base.scss';
@import '../res/css/colors.scss';
@import '../res/css/font/overpass.css';
@import '../res/css/font/overpass-mono.css';
@import '../res/css/common.scss';

.uw-ultrawidify-container-root {
  font-family: 'Overpass';

  .uw-hover {
    position: absolute;
    top: 5%;
    left: 5%;
    width: 90%;
    height: 90%;
    color: #fff;
    background-color: rgba(84, 8, 8, 0.786);

    pointer-events: auto;
    overflow: hidden;

    p, h1, h2, h3 {
      margin: 0.75em;
      display: block;
      // display: inline-block;
    }

    i {
      font-family: 'Overpass Mono', monospace;
    }

    a {
      cursor: pointer;
    }

    p {
      font-size: 16px;
    }
    h1 {
      font-size: 36px;
    }

    sup {
      vertical-align: super;
      font-size: smaller;
    }

    .text {
      flex-grow: 1;
      flex-shrink: 0;
      max-width: 666px;
      min-width: 420px;
    }

    .image-examples {
      flex-grow: auto;
      flex-shrink: 1;
      min-width: 720px;

      img {
        width: 100%;
      }
    }
  }

  .pad {
    padding: 16px;
    height: 100%;
    width: 100%;
    // padding-bottom: 10%;
    overflow-y: auto;
  }
  .flex-row {
    justify-content: space-around;
  }
}


</style>