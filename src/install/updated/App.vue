<template>
  <div class="flex flex-column h100">
    <div class="header flex-nogrow flex-noshrink">
      Thank you for installing Ultrawidify.
    </div>
    <div class="body flex-grow">
      <p>Before we're ready to go, there are three quick questions. You will be able to change these later.</p>
      <h1>Where do you want to use Ultrawidify?</h1>
      <div class="flex flex-row">
        <div class=""
             @click="() => {}"
        >
          All sites<br/>
          <small>(Some sites are disabled by default. Requires access to all sites)</small>
        </div>
        <div>
          Default sites and sites I explicitly allow
        </div>
        <div>
          Only the sites I explicitly allow
        </div>
      </div>

      <h1>Should Ultrawidify automatically detect aspect ratio where possible?</h1>
      <div class="flex flex-row">
        <div class="">
          Yes
        </div>
        <div>
          Only on sites I allow
        </div>
        <div class="">
          Never
        </div>
      </div>

      <h1>Do you want to see update notes when extension receives updates?</h1>
      <p>Update notes will open a new tab, just like this one.</p>
      <div class="flex flex-row">
        <div class="">
          Yes, even for the tiniest changes
        </div>
        <div class="">
          Yes, but only for the big/important ones
        </div>
        <div class="">
          No, never.
        </div>
      </div>
    </div>
    <div class="footer flex-nogrow flex-noshrink">
    </div>
  </div>
</template>

<script>
import Debug from '../../ext/conf/Debug';
import BrowserDetect from '../../ext/conf/BrowserDetect';
import Logger from '../../ext/lib/Logger';

export default {
  data () {
    return {
      selectedTab: 'video',
      selectedFrame: '__all',
      selectedSite: '',
      activeFrames: [],
      activeSites: [],
      port: BrowserDetect.firefox ? browser.runtime.connect({name: 'popup-port'}) : chrome.runtime.connect({name: 'popup-port'}),
      comms: new Comms(),
      frameStore: {},
      frameStoreCount: 0,
      performance: {},
      site: null,
      currentZoom: 1,
      settings: {},
      settingsInitialized: false,
      logger: {},
      siteTabDisabled: false,
      videoTabDisabled: false,
      canShowVideoTab: {canShow: true, warning: true},
      showWhatsNew: false,
    }
  },
  async created() {
    this.logger = new Logger();
    await this.logger.init({
        allowLogging: true,
    });

    this.settings = new Settings({updateCallback: () => this.updateConfig(), logger: this.logger});
    await this.settings.init();
    this.settingsInitialized = true;
  },
  components: {
  },
  methods: {
  }
}
</script>

<style src="../../res/css/font/overpass.css"></style>
<style src="../../res/css/font/overpass-mono.css"></style>
<style src="../../res/css/flex.scss"></style>
<style src="../../res/css/common.scss"></style>

<style lang="scss" scoped>
html, body {
  width: 800px !important;
  max-width: 800px !important;
  padding: 0px;
  margin: 0px;
}

#tablist {
  min-width: 275px;
}

.header {
  overflow: hidden;
  background-color: #7f1416;
  color: #fff;
  margin: 0px;
  margin-top: 0px;
  padding-top: 8px;
  padding-left: 15px;
  padding-bottom: 1px;
  font-size: 2.7em;
}


.menu-item-inline-desc{
  font-size: 0.60em;
  font-weight: 300;
  font-variant: normal;
}

.menu-item {
  flex-grow: 0;
  padding-left: 15px;
  padding-top: 5px;
  padding-bottom: 5px;
  font-variant: small-caps;
  border-left: transparent 5px solid;
  cursor: pointer;
  user-select: none;
}

.menu-item-darker {
  color: #999;
}

.suboption {
  display: block;
  padding-left: 15px;
  padding-right: 15px;
  padding-top: 5px;
  padding-bottom: 20px;
  min-height: 250px;
}


#no-videos-display {
  height: 100%;
  padding-top: 50px;
/*       text-align: center; */
}

.tabitem-container {
  padding-top: 0.5em;
}

.selected-tab {
  background-color: initial;
  border-left: #f18810 5px solid;
}

.tabitem {
  font-variant: normal;
  // font-size: 0.69em;
  // margin-left: 16px;
  border-left: transparent 3px solid;
  padding-left: 12px;
  margin-left: -10px;
}

.site-list {
  max-height: 200px;
}

.tabitem-selected {
  color: #fff !important;
  background-color: initial;
  border-left: #f0c089 3px solid !important;
}
.tabitem-selected::before {
  padding-right: 8px;
}

.tabitem-disabled {
  color: #cc3b0f !important;
}

.tabitem-iframe::after {
  content: "</>";
  padding-left: 0.33em;
}

.popup {
  // max-width: 780px;
  // width: 800px;
  height: 600px;
}
</style>
