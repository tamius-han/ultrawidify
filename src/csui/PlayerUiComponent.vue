<template>
  <div v-if="uiVisible" class="uw-hover uv-hover-trigger-region">
    <div class="flex flex-row pad">
      <div class="text panel">
        <h1>Microsoft Edge is too broken for this extension to work</h1>
        <p><sup>2020-12-21</sup></p>
        <p>In October 2020, Microsoft Edge received an update that renders video playback completely broken. This extension relies on the browser implementing functional video playback, which means that this extension currently cannot work in Edge (and neither can other 21:9 extensions).</p>
        <p>I have attempted all possible workarounds for shits and giggles without success — this issue is completely impossible for me to fix until Microsoft gets their marbles together and fixes their broken browser.</p>
        <p><small>Yes I do recognize the irony of getting pissed at Microsoft for their bugs while my extension is basically the Skyrim of CWS, but guys at Microsoft are getting paid for working on MS Edge and I'm not getting paid for writing this extension.</small></p>
        <p>
          <b>I am not keeping up with Edge updates as I primarily use Firefox and Chrome. If Edge has already fixed their broken video implementation,
            please open an issue on <a href="https://github.com/tamius-han/ultrawidify/issues">github</a>, <a href="mailto:tamius.han@gmail.com">shoot me an email</a> or
            <a href="https://www.reddit.com/message/compose?to=xternal7">PM me on reddit</a>. Please include this string in the message:
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
          Further reading: <a href="">ELI5 blogpost about this problem</a>.
        </p>
        <p>
          I know better than you: <b><a @click="uiVisible=false">hide this popup</a></b>
        </p>
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
  created() {
    console.log("created!");
    console.log("store:", this.$store, this);
  },
  methods: {
    getUrl(url) {
      return BrowserDetect.firefox ? browser.runtime.getURL(url) : chrome.runtime.getURL(url);
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