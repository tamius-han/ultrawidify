<template>
  <div class="flex flex-col h100">
    <div class="header flex-nogrow flex-noshrink">
      Ultrawidify has been updated.
    </div>
    <div class="body flex-grow">
      <h1>Where should Ultrawidify run by default</h1>
      <div class="flex flex-row">
        <div class=""
          @click="() => {}"
        >
          All websites<br/>
          <small>(Some sites are disabled by default.)</small>
        </div>
        <div>
          On sites that people say are working<br/>
          <small>(And the sites I explicitly allow)</small>
        </div>
        <div>
          Officially supported sites*<br/>
          <small>(And the sites I explicitly allow)</small>
        </div>
        <div>
          Only the sites I explicitly allow
        </div>
      </div>
      <div>
        *Ultrawidify still needs access to all websites for technical and historical technical reasons.
      </div>

      <h1>Try to automatically detect aspect ratio?</h1>
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
import BrowserDetect from '../../ext/conf/BrowserDetect';
import { LogAggregator } from '@src/ext/lib/logging/LogAggregator';
import { ComponentLogger } from '@src/ext/lib/logging/ComponentLogger';

export default {
  data () {
    return {
      selectedTab: 'video',
      selectedFrame: '__all',
      selectedSite: '',
      activeFrames: [],
      activeSites: [],
      port: BrowserDetect.firefox ? chrome.runtime.connect({name: 'popup-port'}) : chrome.runtime.connect({name: 'popup-port'}),
      comms: new Comms(),
      frameStore: {},
      frameStoreCount: 0,
      performance: {},
      site: null,
      currentZoom: 1,
      settings: {},
      settingsInitialized: false,
      logger: {},
      logAggregator: {},
      siteTabDisabled: false,
      videoTabDisabled: false,
      canShowVideoTab: {canShow: true, warning: true},
      showWhatsNew: false,
    }
  },
  async created() {
    this.logAggregator = new LogAggregator('');
    this.logger = new ComponentLogger(this.logAggregator, 'App.vue');

    this.settings = new Settings({updateCallback: () => this.updateConfig(), logAggregator: this.logAggregator });
    await this.settings.init();
    this.settingsInitialized = true;
  },
  components: {
  },
  methods: {
    updateConfig() {
      this.settings.init();
      this.$nextTick( () => this.$forceUpdate());
    }
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
