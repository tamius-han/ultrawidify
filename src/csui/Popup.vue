<template>
  <div class="popup-panel" style="height: 100vh">
    <!--
      NOTE — the code that makes ultrawidify popup work in firefox regardless of whether the
      extension is being displayed in a normal or a small/overflow popup breaks the popup
      behaviour on Chrome (where the popup would never reach the full width of 800px)

      Since I'm tired and the hour is getting late, we'll just add an extra CSS class for
      non-firefox builds of this extension and be done with it. No need to complicate things
      further than that.
    -->
    <div v-if="settingsInitialized"
        style="height: 100vh"
        class="popup flex flex-col no-overflow"
        :class="{'popup-chrome': ! BrowserDetect?.firefox}"
    >
      <div class="flex flex-col w-full relative header"
      >
        <div class="flex flex-row w-full" style="height: 42px">
          <h1 class="flex-grow">
            <span class="smallcaps">Ultrawidify</span>: <small>Quick settings</small>
          </h1>
          <button
            class="settings-header-button"
            style="align-self: stretch"
            @click="showInPlayerUi()"
          >
            Show settings window
          </button>
        </div>

        <div class="flex flex-row w-full">
          <div v-if="site && siteSettings" style="transform: scale(0.75) translateX(-12.5%); margin-bottom: -0.5rem; align-content: center" class="flex flex-row flex-grow items-center">
            <div>site: {{site.host}}</div>
            <SupportLevelIndicator
              :siteSupportLevel="siteSupportLevel"
            >
            </SupportLevelIndicator>
          </div>

          <!-- Version info -->
          <div v-if="BrowserDetect?.processEnvChannel !== 'stable'" class="absolute channel-info version-info">
            <label>Version:</label> <br/>
            {{ settings.getExtensionVersion() }} (non-stable)
          </div>
          <div v-else class="version-info">
            <label>Version:</label> <br/>
            {{ settings.getExtensionVersion() }}
          </div>
        </div>
      </div>


      <!-- CONTAINER ROOT -->
      <div class="flex flex-row body no-overflow flex-grow">

        <!-- TABS -->
        <div class="flex flex-col tab-row" style="flex: 3 3; border-right: 1px solid #222;">
          <div
            v-for="tab of tabs"
            :key="tab.id"
            class="tab flex flex-row"
            :class="{
              'active': tab.id === selectedTab,
              'highlight-tab': tab.highlight,
            }"
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
        <div class="scrollable window-content" style="flex: 7 7; padding: 1rem;">
          <template v-if="settings && siteSettings">
            <PopupVideoSettings
              v-if="selectedTab === 'videoSettings'"
              :settings="settings"
              :eventBus="eventBus"
              :siteSettings="siteSettings"
              :hosts="activeHosts"
            ></PopupVideoSettings>
            <BaseExtensionSettings
              v-if="selectedTab === 'extensionSettings'"
              :settings="settings"
              :eventBus="eventBus"
              :siteSettings="siteSettings"
              :site="site.host"
              :hosts="activeHosts"
            >
            </BaseExtensionSettings>
            <ChangelogPanel
              v-if="selectedTab === 'changelog'"
              :settings="settings"
            ></ChangelogPanel>
            <AboutPanel
              v-if="selectedTab === 'about'"
            >
            </AboutPanel>
          </template>
          <template v-else>No settings or site settings found.</template>
        </div>

      </div>
    </div>
  </div>
</template>

<script>
import BaseExtensionSettings from './src/PlayerUiPanels/BaseExtensionSettings.vue'
import PlayerDetectionPanel from './src/PlayerUiPanels/PlayerDetectionPanel.vue'
import ChangelogPanel from './src/PlayerUiPanels/ChangelogPanel.vue'
import PopupVideoSettings from './src/popup/panels/PopupVideoSettings.vue'
import AboutPanel from '@csui/src/popup/panels/AboutPanel.vue'
import Debug from '../ext/conf/Debug';
import BrowserDetect from '../ext/conf/BrowserDetect';
import CommsClient, {CommsOrigin} from '../ext/lib/comms/CommsClient';
import Settings from '../ext/lib/settings/Settings';
import EventBus from '../ext/lib/EventBus';
import {ChromeShittinessMitigations as CSM} from '../common/js/ChromeShittinessMitigations';
import SupportLevelIndicator from '@csui/src/components/SupportLevelIndicator.vue'
import { LogAggregator } from '@src/ext/lib/logging/LogAggregator';
import { ComponentLogger } from '@src/ext/lib/logging/ComponentLogger';

export default {
  components: {
    Debug,
    BrowserDetect,
    PopupVideoSettings,
    PlayerDetectionPanel,
    BaseExtensionSettings,
    SupportLevelIndicator,
    ChangelogPanel,
    AboutPanel
  },
  data () {
    return {
      comms: undefined,
      eventBus: new EventBus(),
      settings: {},
      settingsInitialized: false,
      narrowPopup: null,
      sideMenuVisible: null,
      logAggregator: undefined,
      logger: undefined,
      site: undefined,
      siteSettings: undefined,
      selectedTab: 'videoSettings',
      tabs: [
        // see this for icons: https://pictogrammers.com/library/mdi/
        // {id: 'playerUiCtl', label: 'In-player UI', icon: 'artboard'},
        {id: 'videoSettings', label: 'Video settings', icon: 'crop'},
        // {id: 'playerDetection', label: 'Player detection', icon: 'television-play'},
        {id: 'extensionSettings', label: 'Site and Extension options', icon: 'cogs' },
        {id: 'changelog', label: 'What\'s new', icon: 'alert-decagram' },
        {id: 'about', label: 'About', icon: 'information-outline'},
      ],
    }
  },
  computed: {
    siteSupportLevel() {
      return (this.site && this.siteSettings) ? this.siteSettings.data.type || 'no-support' : 'waiting';
    }
  },
  mounted() {
    this.tabs.find(x => x.id === 'changelog').highlight = !this.settings.active?.whatsNewChecked;
    this.requestSite();
  },
  async created() {
    try {
      this.logAggregator = new LogAggregator('🔵ext-popup🔵');
      this.logger = new ComponentLogger(this.logAggregator, 'Popup');

      this.settings = new Settings({afterSettingsSaved: () => this.updateConfig(), logAggregator: this.logAggregator});
      await this.settings.init();
      this.settingsInitialized = true;

      // const port = chrome.runtime.connect({name: 'popup-port'});
      // port.onMessage.addListener( (m,p) => this.processReceivedMessage(m,p));
      // CSM.setProperty('port', port);

      this.eventBus = new EventBus();
      this.eventBus.subscribe(
        'set-current-site',
        {
          source: this,
          function: (config, context) => {
            if (this.site) {
              if (!this.site.host) {
                // dunno why this fix is needed, but sometimes it is
                this.site.host = config.site.host;
              }
            }
            this.site = config.site;
            // this.selectedSite = this.selectedSite || config.site.host;
            this.siteSettings = this.settings.getSiteSettings({site: this.site.host});
            this.eventBus.setupPopupTunnelWorkaround({
              origin: CommsOrigin.Popup,
              comms: {
                forwardTo: 'active'
              }
            });

            this.loadHostnames();
            this.loadFrames();
          }
        },
      );
      this.eventBus.subscribe(
        'open-popup-settings',
        {
          source: this,
          function: (config) => {
            this.selectTab(config.tab)
          }
        }
      )

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
    } catch (e) {
      console.error('[Popup.vue::created()] An error happened:', e)
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

  methods: {
    showInPlayerUi() {
      this.eventBus.send('uw-set-ui-state', {globalUiVisible: true}, {comms: {forwardTo: 'active'}});
    },
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
          {},
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
    isDefaultFrame(frameId) {
      return frameId === '__playing' || frameId === '__all';
    },
    loadHostnames() {
      this.activeHosts = this.site.hostnames;
    },
    loadFrames() {
      this.activeFrames = [{
        host: this.site.host,
        isIFrame: false,  // not used tho. Maybe one day
      }];

      for (const frame in this.site.frames) {
        if (!this.activeFrames.find(x => x.host === this.site.frames[frame].host)) {
          this.activeFrames.push({
            id: `${this.site.id}-${frame}`,
            label: this.site.frames[frame].host,
            host: this.site.frames[frame].host,
            ...this.site.frames[frame],
            ...this.settings.active.sites[this.site.frames[frame].host]
          })
        };
      }
    },
    getRandomColor() {
      return `rgb(${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)})`;
    },
    updateConfig() {
      this.settings.init();
      this.$nextTick( () => this.$forceUpdate());
    }
  }
}
</script>

<style lang="scss">
// @import 'res/css/uwui-base.scss';
@import 'res/css/colors.scss';
@import 'res/css/font/overpass.css';
@import 'res/css/font/overpass-mono.css';
@import 'res/css/common.scss';
@import './src/res-common/_variables';

.header {
  background-color: rgb(90, 28, 13);
  background-color: rgb(0,0,0);
  color: #fff;
  padding: 8px;

  // display: flex;
  // flex-direction: row;
  // justify-content: space-between;

  border-bottom: 1px dotted #fa6;


  h1 {
    font-size: 2rem;
  }

  .version-info {
    text-align: right;
    font-size: 0.8rem;
    opacity: 0.8;
    label {
      opacity: 0.5;
    }
  }

}

.settings-header-button {
  display: flex;
  flex-direction: row;
  align-items: center;

  padding: 0.5rem 2rem;
  text-transform: lowercase;
  font-variant: small-caps;

  background-color: #000;
  border: 1px solid #fa68;

  color: #eee;
}

.site-support-info {
  display: flex;
  flex-direction: row;
  align-items: center;

  .site-support-site {
    font-size: 1.5em;
  }

  .site-support {
    display: inline-flex;
    flex-direction: row;
    align-items: center;

    margin-left: 1rem;
    border-radius: 8px;
    padding: 0rem 1.5rem 0rem 1rem;

    position: relative;

    .tooltip {
      padding: 1rem;
      display: none;
      position: absolute;
      bottom: 0;
      transform: translateY(110%);
      width: 42em;

      background-color: rgba(0,0,0,0.90);
      color: #ccc;
    }
    &:hover {
      .tooltip {
        display: block;
      }
    }

    .mdi {
      margin-right: 1rem;
    }

    &.official {
      background-color: #fa6;
      color: #000;

      .mdi {
        fill: #000 !important;
      }
    }

    &.community {
      background-color: rgb(85, 85, 179);
      color: #fff;

      .mdi {
        fill: #fff !important;
      }
    }

    &.no-support {
      background-color: rgb(138, 65, 126);
      color: #eee;

      .mdi {
        fill: #eee !important;
      }
    }

    &.user-added {
      border: 1px solid #ff0;

      color: #ff0;

      .mdi {
        fill: #ff0 !important;
      }
    }
  }
}

.content {
  flex-grow: 1;

  .warning-area {
    flex-grow: 0;
    flex-shrink: 0;
  }

  .panel-content {
    flex-grow: 1;
    flex-shrink: 1;

    overflow-y: auto;
    padding: 1rem;
  }
}

.warning-box {
  background: rgb(255, 174, 107);
  color: #000;
  margin: 1rem;
  padding: 1rem;

  display: flex;
  flex-direction: row;
  align-items: center;

  .icon-container {
    margin-right: 1rem;
    flex-shrink: 0;
    flex-grow: 0;
  }

  a {
    color: rgba(0,0,0,0.7);
    cursor: pointer;
  }
}


.popup-panel {
  background-color: rgba(0,0,0,0.50);
  color: #fff;

  overflow-y: auto;

  .popup-window-header {
    padding: 1rem;
    background-color: rgba(5,5,5, 0.75);
  }
  .tab-row {
    background-color: rgba(11,11,11, 0.75);

    .tab {
      display: flex;
      flex-direction: row;
      align-items: center;

      padding: 1rem;
      font-size: 1.25rem;
      // height: rem;
      min-height: 3rem;

      border-bottom: 1px solid rgba(128, 128, 128, 0.5);
      border-top: 1px solid rgba(128, 128, 128, 0.5);
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
      &.active {
        opacity: 1.0;
        background-color: $primaryBg;
        color: rgb(255, 174, 107);
        border-bottom: 1px solid rgba(116, 78, 47, 0.5);
        border-top: 1px solid rgba(116, 78, 47, 0.5);
      }

      .icon-container {
        width: 64px;
        flex-grow: 0;
        flex-shrink: 0;
      }
      .label {
        flex-grow: 1;
        flex-shrink: 1;
        padding: 0 !important;
      }

      &.highlight-tab {
        opacity: 0.9;
        color: #eee;

        // .label {
        //   color: rgb(239, 192, 152);
        // }
      }
    }
  }

  .popup-title, .popup-title h1 {
    font-size: 48px !important;
  }
}

pre {
  white-space: pre-wrap;
}

.button {
  border: 1px solid #222 !important;
}

h1 {
  margin: 0; padding: 0; font-weight: 400; font-size:24px;
}

.window-content {
  height: 100%;
  width: 100%;
  overflow: auto;
}
</style>
