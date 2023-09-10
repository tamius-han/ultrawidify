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


    <!-- CONTAINER ROOT -->
    <div class="flex flex-row body no-overflow flex-grow">

      <!-- TABS -->
      <div class="flex flex-col">
        <div
          v-for="tab of tabs"
          :key="tab.id"
          class="tab"
          :class="{'active': tab.id === selectedTab}"
          @click="selectTab(tab.id)"
        >
          <div class="icon-container">
            <mdicon
              :name="tab.icon"
              :size="32"
            />
          </div>
          <div class="label">
            {{tab.label}}
          </div>
        </div>
      </div>

      <!-- CONTENT -->
      <div class="scrollable">
        <template v-if="settings && siteSettings">
          <PopupVideoSettings
            v-if="selectedTab === 'videoSettings'"
            :settings="settings"
            :eventBus="eventBus"
            :siteSettings="siteSettings"
          ></PopupVideoSettings>
          <PlayerDetectionPanel
            v-if="selectedTab === 'playerDetection'"
            :settings="settings"
            :eventBus="eventBus"
            :siteSettings="siteSettings"
            :site="site.host"
          >
          </PlayerDetectionPanel>
          <BaseExtensionSettings
            v-if="selectedTab === 'extensionSettings'"
            :settings="settings"
            :eventBus="eventBus"
            :siteSettings="siteSettings"
            :site="site.host"
          >
          </BaseExtensionSettings>
        </template>
      </div>

    </div>
  </div>

</template>

<script>
import BaseExtensionSettings from './src/PlayerUiPanels/BaseExtensionSettings.vue'
import PlayerDetectionPanel from './src/PlayerUiPanels/PlayerDetectionPanel.vue'
import PopupVideoSettings from './src/popup/panels/PopupVideoSettings.vue'
import Debug from '../ext/conf/Debug';
import BrowserDetect from '../ext/conf/BrowserDetect';
import Comms from '../ext/lib/comms/Comms';
import CommsClient, {CommsOrigin} from '../ext/lib/comms/CommsClient';
import Settings from '../ext/lib/Settings';
import Logger from '../ext/lib/Logger';
import EventBus from '../ext/lib/EventBus';
import {ChromeShittinessMitigations as CSM} from '../common/js/ChromeShittinessMitigations';

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
      siteSettings: undefined,
      selectedTab: 'playerUiCtl',
      tabs: [
        // see this for icons: https://pictogrammers.com/library/mdi/
        {id: 'playerUiCtl', label: 'In-player UI', icon: 'artboard'},
        {id: 'videoSettings', label: 'Video settings', icon: 'crop'},
        {id: 'playerDetection', label: 'Player detection', icon: 'television-play'},
        {id: 'extensionSettings', label: 'Site and Extension options', icon: 'cogs' },
      ],
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
          // this.selectedSite = this.selectedSite || config.site.host;
          this.siteSettings = this.settings.getSiteSettings(this.site.host);

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
    BrowserDetect,
    PopupVideoSettings, PlayerDetectionPanel, BaseExtensionSettings
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
    selectTab(tab) {
      this.selectedTab = tab;
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
      // this.updateCanShowVideoTab();
    },
    getRandomColor() {
      return `rgb(${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)})`;
    }
  }
}
</script>
