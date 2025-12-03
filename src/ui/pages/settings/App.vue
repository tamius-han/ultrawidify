<template>
  <div class="w-full h-[100dvh] overflow-hidden flex flex-row justify-center items-center py-4 px-16">

    <!-- page content -->
    <div class="w-full max-w-[1920px] h-[100dvh] overflow-hidden flex flex-col">
      <h1 class="text-[3em] grow-0 shrink-0">Ultrawidify settings</h1>

      <div v-if="!settingsInitialized" class="flex flex-row w-full justify-center items-center">
        Loading settings...
      </div>

      <SettingsWindowContent v-else
        class="grow shrink"
        :role="role"
        :initialPath="initialPath"
        :settings="settings"
        :eventBus="eventBus"
        :logger="logger"
        :inPlayer="false"
        :site="null"
      >
      </SettingsWindowContent>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BrowserDetect from '../../../ext/conf/BrowserDetect';
import { LogAggregator } from '@src/ext/lib/logging/LogAggregator';
import { ComponentLogger } from '@src/ext/lib/logging/ComponentLogger';
import Settings from '@src/ext/lib/settings/Settings';
import SettingsWindowContent from '@components/SettingsWindowContent.vue';

import EventBus from '@src/ext/lib/EventBus';
import CommsClient, { CommsOrigin } from '@src/ext/lib/comms/CommsClient';
import {ChromeShittinessMitigations as CSM} from '@src/common/js/ChromeShittinessMitigations';

export default defineComponent({
  components: {
    SettingsWindowContent
  },
  data () {
    return {
      settings: undefined as Settings | undefined,
      logger: undefined as ComponentLogger | undefined,
      logAggregator: undefined as LogAggregator | undefined,
      settingsInitialized: false,
      role: 'settings',
      initialPath: undefined as string[] | undefined,
    }
  },
  async created() {
    const [segment, ...path] = window.location.hash.split('/');
    this.initialPath = path;

    switch (segment) {
      case '#popup':
        await this.setupPopup();
        break;
      case '#iframe':
        await this.setupIframe();
        break;
      default:
        await this.setupSettingsPage();
    }

    await this.settings.init();
    this.settingsInitialized = true;
  },
  methods: {
    updateConfig() {
      this.settings.init();
      this.$nextTick( () => this.$forceUpdate());
    },

    /**
     * Initializes page when it's being loaded from the settings
     */
    async setupSettingsPage() {
      this.role = 'settings';

      this.logAggregator = new LogAggregator('');
      this.logger = new ComponentLogger(this.logAggregator, 'App.vue');

      this.settings = new Settings({
        logAggregator: this.logAggregator,
        onSettingsChanged: () => this.updateConfig()
      });
    },

    /**
     * Initializes page when it's being loaded as extension popup
     */
    async setupPopup() {
      this.role = 'popup';
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

    /**
     * Initializes page when it's being loaded as in-page settings window
     */
    async setupIframe() {
      this.role='ui-window';

      this.logAggregator = new LogAggregator('settings-page');
      this.logger = new ComponentLogger(this.logAggregator, 'SettingsPage');

      this.settings = new Settings({
        logAggregator: this.logAggregator,
        onSettingsChanged: () => this.updateConfig()
      });

      if (this.defaultTab) {
        this.selectedTab = this.defaultTab;
      }
      this.siteSettings = this.settings.getSiteSettings({site: this.site});
      this.tabs.find(x => x.id === 'changelog').highlight = !this.settings.active?.whatsNewChecked;

      this.eventBus?.subscribe(
        'uw-show-ui',
        {
          source: this,
          function: () => {
            if (this.inPlayer) {
              return; // show-ui is only intended for global overlay
            }
          },
        }
      )
    }
  }
});
</script>

