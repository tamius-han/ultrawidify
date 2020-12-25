<template>
  <div v-if="uiVisible" class="uw-hover uv-hover-trigger-region">
    <div class="flex flex-column flex-center">
      <div class="text panel">
        <h1>Your browser is incompatible with this extension on this site</h1>
        <!-- <p><sup>2020-12-22</sup></p> -->
        <p>
          In October 2020, Microsoft Edge received an update that breaks video playback on sites that utilize DRM in certain cases.
          As a result of this bug, cropped videos will be displayed incorrectly. This issue cannot be fixed by any extension, and
          <b>using this extension (and its alternatives) on this site may make things worse</b> — even if you only set aspect ratio manually.
        </p>
        <p>
          I have attempted all possible workarounds and none of them work.
        </p>
        <p>
          I would like to ask a couple of favours:
        </p>
        <p>
          <ul>
            <li>
              <b>Report this issue to Microsoft.</b>
              I have already done so, however such issues get noticed quicker if more people report them.
              <div class="vspc"></div>
              I have prepared a description of the problem — you can find it below (you may need to scroll).
            </li>
            <li>
              <b>Please notify me when Microsoft fixes this issue.</b>
              I use windows only sporadically and cannot check whether Edge developers have fixed the issue or not.
              You can contact me by opening an issue on <a href="https://github.com/tamius-han/ultrawidify/issues" target="_blank">github</a> or
              sending me <a href="mailto:tamius.han@gmail.com" target="_blank">an email</a>. You can also <a href="https://www.reddit.com/message/compose?to=xternal7" target="_blank">PM me on reddit</a>.
              <div class="vspc"></div>
              Please include the following text with your message:
              <div class="vspc"></div>
              <i>{{userAgent}}</i>
              <div class="vspc"></div>
              You can determine whether the issue is fixed by attempting to watch 21:9 movie on netflix and compare what you see to the screenshots I included at the bottom.
            </li>
            <li>
              <small>
                <b>Avoid leaving one-star reviews on Chrome Web Store.</b> I don't usually whine about one star 
                reviews, but Chrome Web Store is for Google Chrome users. As such, I cannot optimize the extension
                for Edge in my Chrome Web Store submission. Furthermore, people reading reviews in Chrome
                Web Store are interested in knowing how extension behaves in Google Chrome. The experience you
                get in Microsoft Edge is irrelevant to them.
                <div class="vspc"></div>
                If you wish the best experience, you should install this addon from Edge Addons store (once I make
                it available on that store again).
                <div class="vspc"></div>
                Thanks for being understanding.
              </small>
            </li>
          </ul>
        </p>
        <p>
           <b>Thanks for your help in advance. It's much appreciated.</b>
        </p>
        <p>&nbsp;</p>
        <p>
          If you're interested in more details about why this happens, you can find more details in <a href="https://stuff.tamius.net/sacred-texts/2020/12/22/ultrawidify-and-edge-2020-edition/" target="_blank">this blogpost</a>.
        </p>
        <p>
          Finished reading? <b><a @click="uiVisible=false">Hide this popup</a></b>.
        </p>
        <p>
          In order to disable this popup forever, open the ultrawidify popup, click on 'site settings' and disable automatic aspect ratio detection for this site.
          You should probably even disable the extension for this site altogether for the time being.
        </p>
        <p>
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
        <p>It's the squeaky wheel that gets the grease: developers tend to prioritize issues that affect more people. The more people report this issue, the more likely it is for developers to notice it.</p>
      </div>
      <div class="image-examples panel">
        <h3>How can one tell when the Edge bug is fixed?</h3>
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
import FontLoader from '../ext/lib/uwui/FontLoader';

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
  created() {
    FontLoader.loadFonts();
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
// @import '../res/css/font/overpass.css';
// @import '../res/css/font/overpass-mono.css';
@import '../res/css/common.scss';

.uw-ultrawidify-container-root {

  * {
    font-family: 'Overpass', 'Segoe UI';
    pointer-events: all;
  }

  pointer-events: auto;


  .vspc {
    height: 0.5em;
    display: block;
  }

  .uw-hover {
    position: absolute;
    top: 5%;
    left: 5%;
    width: 90%;
    height: 90%;
    color: #ddd;
    background-color: rgba(84, 8, 8, 0.786);

    pointer-events: auto;
    overflow-y: scroll;

    p, h1, h2, h3 {
      margin: 0.75em;
      display: block;
      // display: inline-block;
    }

    h1 {
      color: #fff;
      text-align: center;
    }
    
    h2, h3 {
      color: #fa6;
      text-align: center;
    }

    i {
      display: block !important;
      padding: 4px 8px;
      font-family: 'Overpass Mono', monospace;
      background-color: rgba(11,11,11,0.75);
      font-size: 0.8em;
    }

    b {
      color: #fff;
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
      max-width: 960px;
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

    ul { 
      list-style-type: disc; 
      list-style-position: inside; 
    }
    ol { 
      list-style-type: decimal; 
      list-style-position: inside; 
    }
    ul ul, ol ul { 
      list-style-type: circle; 
      list-style-position: inside; 
      margin-left: 15px; 
    }
    ol ol, ul ol { 
      list-style-type: lower-latin; 
      list-style-position: inside; 
      margin-left: 15px; 
    }
    li {
      margin-top: 16px;
      line-height: 16px;
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