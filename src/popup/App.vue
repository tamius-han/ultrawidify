<template>
  <!--
    NOTE — the code that makes ultrawidify popup work in firefox regardless of whether the
    extension is being displayed in a normal or a small/overflow popup breaks the popup
    behaviour on Chrome (where the popup would never reach the full width of 800px)

    Since I'm tired and the hour is getting late, we'll just add an extra CSS class for
    non-firefox builds of this extension and be done with it. No need to complicate things
    further than that.
  -->
  <div v-if="settingsInitialized"
       class="popup flex flex-column no-overflow"
       :class="{'popup-chrome': ! BrowserDetect?.firefox}"
  >
    <div class="flex-row flex-nogrow flex-noshrink relative"
         :class="{'header': !narrowPopup, 'header-small': narrowPopup}"
    >
      <span class="smallcaps">Ultrawidify</span>: <small>Quick settings</small>
      <div class="absolute channel-info" v-if="BrowserDetect?.processEnvChannel !== 'stable'">
        Build channel: {{BrowserDetect?.processEnvChannel}}
      </div>
    </div>
    <div class="">
      TODO: force open UI button
    </div>
    <div class="flex flex-row body no-overflow flex-grow">
      <div class="">
        side menu
      </div>
      <div class="scrollable">
        <PopupVideoSettings
          :settings="settings"
          :eventBus="eventBus"
          :site="site"
          :frame="selectedFrame"
        ></PopupVideoSettings>
      </div>
      <!-- <pre>
        ---- site:
        {{site}}

        ----
      </pre> -->

    </div>
  </div>

</template>

<script>
import PopupVideoSettings from './panels/PopupVideoSettings.vue'
import Debug from '../ext/conf/Debug';
import BrowserDetect from '../ext/conf/BrowserDetect';
import Comms from '../ext/lib/comms/Comms';
import CommsClient, {CommsOrigin} from '../ext/lib/comms/CommsClient';
import Settings from '../ext/lib/Settings';
import Logger from '../ext/lib/Logger';
import EventBus from '../ext/lib/EventBus';
import {ChromeShittinessMitigations as CSM} from '../common/js/ChromeShittinessMitigations';
import { browser } from 'webextension-polyfill-ts';

export default {
  data () {
    return {
      comms: undefined,
      eventBus: new EventBus(),
      settings: {},
      settingsInitialized: false,
      narrowPopup: null,
      sideMenuVisible: null,
      logger: undefined,
      site: undefined,

      selectedFrame: '__playing',
    }
  },
  async created() {
    this.logger = new Logger();
    await this.logger.init({
        allowLogging: true,
    });

    this.settings = new Settings({afterSettingsSaved: () => this.updateConfig(), logger: this.logger});
    await this.settings.init();
    this.settingsInitialized = true;

    // const port = browser.runtime.connect({name: 'popup-port'});
    // port.onMessage.addListener( (m,p) => this.processReceivedMessage(m,p));
    // CSM.setProperty('port', port);

    this.eventBus = new EventBus();
    this.eventBus.subscribe(
      'set-current-site',
      {
        function: (config, context) => {
          if (this.site) {
            if (!this.site.host) {
              // dunno why this fix is needed, but sometimes it is
              this.site.host = config.site.host;
            }
          }
          this.site = config.site;
          this.selectedSite = this.selectedSite || config.site.host;

          this.eventBus.setupPopupTunnelWorkaround({
            origin: CommsOrigin.Popup,
            comms: {
              forwardTo: 'active'
            }
          });

          this.loadFrames(this.site);

        }
      }
    );

    this.comms = new CommsClient('popup-port', this.logger, this.eventBus);
    this.eventBus.setComms(this.comms);
    this.eventBus.setupPopupTunnelWorkaround({
      origin: CommsOrigin.Popup,
      comms: {forwardTo: 'active'}
    });


    // ensure we'll clean player markings on popup close
    window.addEventListener("unload", () => {
      CSM.port.postMessage({
        cmd: 'unmark-player',
        forwardToAll: true,
      });
      // if (BrowserDetect.anyChromium) {
      //   chrome.extension.getBackgroundPage().sendUnmarkPlayer({
      //     cmd: 'unmark-player',
      //     forwardToAll: true,
      //   });
      // }
    });

    // get info about current site from background script
    while (true) {
      this.requestSite();
      await this.sleep(5000);
    }
  },
  async updated() {
    const body = document.getElementsByTagName('body')[0];

    // ensure that narrowPopup only gets set the first time the popup renders
    // if popup was rendered before, we don't do anything because otherwise
    // we'll be causing an unwanted re-render
    //
    // another thing worth noting — the popup gets first initialized with
    // offsetWidth set to 0. This means proper popup will be displayed as a
    // mini popup if we don't check for that.
    if (this.narrowPopup === null && body.offsetWidth > 0) {
      this.narrowPopup = body.offsetWidth < 600;
    }
  },
  components: {
    Debug,
    BrowserDetect, PopupVideoSettings
  },
  methods: {
    async sleep(t) {
      return new Promise( (resolve,reject) => {
        setTimeout(() => resolve(), t);
      });
    },
    toObject(obj) {
      return JSON.parse(JSON.stringify(obj));
    },
    requestSite() {
      try {
        this.logger.log('info','popup', '[popup::getSite] Requesting current site ...')
        // CSM.port.postMessage({command: 'get-current-site'});
        this.eventBus.send(
          'get-current-site',
          undefined,
          {
            comms: {forwardTo: 'active'}
          }
        );
      } catch (e) {
        this.logger.log('error','popup','[popup::getSite] sending get-current-site failed for some reason. Reason:', e);
      }
    },
    getRandomColor() {
      return `rgb(${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)})`;
    },

    processReceivedMessage(message, port) {
      this.logger.log('info', 'popup', '[popup::processReceivedMessage] received message:', message)
      console.info('[popup::processReceivedMessage] got message:', message);

      if (message.command === 'set-current-site'){
        if (this.site) {
          if (!this.site.host) {
            // dunno why this fix is needed, but sometimes it is
            this.site.host = site.tabHostname;
          }
        }
        this.site = message.site;

        // update activeSites
        // this.activeSites = this.activeSites.filter(x => x.host !== message.site);

        // add current site
        // this.activeSites = unshift({
        //   host: message.site.host,
        //   isIFrame: false,  // currently unused
        // });
        this.selectedSite = this.selectedSite || message.site.host;

        this.loadFrames(this.site);
      }

      return true;
    },

    isDefaultFrame(frameId) {
      return frameId === '__playing' || frameId === '__all';
    },
    loadFrames() {
      this.activeSites = [{
        host: this.site.host,
        isIFrame: false,  // not used tho. Maybe one day
      }];
      this.selectedSite = this.selectedSite || this.site.host;

      // for (const frame in videoTab.frames) {
      //   this.activeFrames.push({
      //     id: `${this.site.id}-${frame}`,
      //     label: videoTab.frames[frame].host,
      //     ...this.frameStore[frame],
      //   })

      //   // only add each host once at most
      //   if (!this.activeSites.find(x => x.host === videoTab.frames[frame].host)) {
      //     this.activeSites.push({
      //       host: videoTab.frames[frame].host,
      //       isIFrame: undefined // maybe one day
      //     });
      //   }
      // }

      // update whether video tab can be shown
      this.updateCanShowVideoTab();
    },
    getRandomColor() {
      return `rgb(${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)})`;
    }
  }
}
</script>

<style src="../res/css/font/overpass.css"></style>
<style src="../res/css/font/overpass-mono.css"></style>
<style src="../res/css/flex.scss"></style>
<style src="../res/css/common.scss"></style>

<style lang="scss" scoped>
html {
  // width: 800px !important;
  // max-width: 800px !important;
  padding: 0px;
  margin: 0px;
}

.zero-width {
  width: 0px !important;
  overflow: hidden;
}

.header .header-small, .narrow-content {
  padding: 8px;
}

#tablist {
  min-width: 275px;
  max-width: 300px;
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
  font-size: 1.75rem;
}
.header-small {
  overflow: hidden;
  background-color: #7f1416;
  color: #fff;
  margin: 0px;
  margin-top: 0px;
  padding-top: 8px;
  padding-left: 15px;
  padding-bottom: 1px;
  font-size: 1.27em;
}

.scrollable {
  height: 100%;
  overflow-y: auto;
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

.menu-button {
  margin-bottom: 4px;
  padding: 4px;
  border-bottom: #f18810 1px solid !important;
  font-size: 1.5rem !important;
  cursor: pointer;
  user-select: none;;
}

.popup {
  height: 600px;
}

/**
  This was written at the top, but it's worth repeating.

  NOTE — the code that makes ultrawidify popup work in firefox regardless of whether the
  extension is being displayed in a normal or a small/overflow popup breaks the popup
  behaviour on Chrome (where the popup would never reach the full width of 800px)

  Since I'm tired and the hour is getting late, we'll just add an extra CSS class for
  non-firefox builds of this extension and be done with it. No need to complicate things
  further than that.

  It also seems that Chrome doesn't like if we set the width of the popup all the way to
  800px (probably something something scrollbar), so let's just take away a few px.
 */
.popup-chrome {
  width: 780px !important;
}

.relative {
  position: relative;
}
.absolute {
  position: absolute;
}
.channel-info {
  height: 0px;
  right: 1.5rem;
  bottom: 0.85rem;
  font-size: 0.75rem;
}

.show-more {
  padding-top: 12px;
  font-size: 0.9rem;
}
</style>
