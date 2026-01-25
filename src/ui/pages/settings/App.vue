<template>
  <div
    class="
      w-full h-[100dvh] overflow-hidden
      flex flex-row justify-center items-center
    "
    :class="{
      'p-1 popup-lg:py-2 popup-lg:px-2 window:py-4 window:px-8 bg-stone-950': role !== 'ui-window'
    }"
  >

    <!-- page content -->
    <div
      class="w-full h-[100dvh] overflow-hidden flex flex-col"
      :class="{'max-w-[1920px]': !isDebugging && role !== 'ui'}"
    >

      <div class="flex flex-row font-mono text-[0.8rem] text-stone-500 border-stone-500">
        <!-- <pre>
        url: {{getUrl}}
        ——
        site: <pre>{{JSON.stringify(site, null, 2)}}</pre>
        ——
        </pre> -->
      </div>

      <PopupHead
        v-if="role === 'popup' && settings && siteSettings && eventBus"
        :settings="settings"
        :siteSettings="siteSettings"
        :site="site"
        :eventBus="eventBus"
      >
      </PopupHead>

      <div v-else>
        <h1 class="text-[3em] grow-0 shrink-0">Ultrawidify settings</h1>
      </div>

      <div v-if="!settingsInitialized" class="flex flex-row w-full justify-center items-center">
        Loading settings...
      </div>

      <SettingsWindowContent v-else
        class="grow shrink"
        :role="role"
        :initialPath="initialPath"
        :settings="settings"
        :siteSettings="siteSettings"
        :eventBus="eventBus"
        :logger="logger"
        :inPlayer="false"
        :site="site"
        @debugStatusChanged="setDebugStatus"
      >
      </SettingsWindowContent>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BrowserDetect from '@src/ext/conf/BrowserDetect';
import { LogAggregator } from '@src/ext/module/logging/LogAggregator';
import { ComponentLogger } from '@src/ext/module/logging/ComponentLogger';
import Settings from '@src/ext/module/settings/Settings';
import { SiteSettings } from '@src/ext/module/settings/SiteSettings';
import SettingsWindowContent from '@components/SettingsWindowContent.vue';

import EventBus from '@src/ext/module/EventBus';
import CommsClient, { CommsOrigin } from '@src/ext/module/comms/CommsClient';
import {ChromeShittinessMitigations as CSM} from '@src/common/js/ChromeShittinessMitigations';

import PopupHead from '@components/PopupHead.vue';
import ExtensionMode from '../../../common/enums/ExtensionMode.enum';
import WarningsMixin from '../../utils/mixins/WarningsMixin.vue';

export default defineComponent({
  components: {
    SettingsWindowContent,
    PopupHead,
  },
  mixins: [
    WarningsMixin
  ],
  data () {
    return {
      BrowserDetect,
      site: undefined,
      settings: undefined as Settings | undefined,
      siteSettings: undefined as SiteSettings | undefined,
      eventBus: undefined as EventBus | undefined,
      logger: undefined as ComponentLogger | undefined,
      logAggregator: undefined as LogAggregator | undefined,
      settingsInitialized: false,
      role: 'settings',
      initialPath: undefined as string[] | undefined,
      isDebugging: false,
    }
  },
  computed: {
    getUrl() {
      return window.location.href;
    }
  },
  async created() {
    try {
      const [segment, ...path] = window.location.hash.split('/');
      this.initialPath = path;

      switch (segment) {
        case '#popup':
          await this.setupPopup();
          break;
        case '#ui':
          await this.setupIframe();
          break;
        case '#settings':
        case '#updated':
        case '#installed':
        default:
          await this.setupSettingsPage(segment);
      }

      if (segment !== '#popup') {
        // undo that workaround that makes popup work correctly if we aren't in a popup
        document.getElementsByTagName('html')[0].setAttribute('style', '');
      }

      await this.settings.init();
      this.settingsInitialized = true;
    } catch (e) {
      console.error(`ultrawidify::failed to create vue app:`, e);
    }
  },
  methods: {
    setDebugStatus(isDebugging: boolean) {
      this.isDebugging = isDebugging;
    },
    updateConfig() {
      this.settings.init();
      this.$nextTick( () => this.$forceUpdate());
    },

    /**
     * Initializes page when it's being loaded from the settings
     */
    async setupSettingsPage(segment) {
      if (!segment) {
        this.role = 'settings';
      } else {
        this.role = segment.replace('#', '');
      }

      this.logAggregator = new LogAggregator('App.vue');
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

        this.eventBus = new EventBus({name: 'popup'});
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
              this.site = {...config.site, from: 'set-current-site, via setupPopup'};
              // this.selectedSite = this.selectedSite || config.site.host;
              this.siteSettings = this.settings.getSiteSettings({site: this.site.host});

              console.log('set-site received:', this.site, this.siteSettings, 'current path:', this.initialPath);
              if (!this.initialPath || this.initialPath.length < 1) {
                if (this.siteSettings.data.enable) {
                  this.initialPath = ['video-settings'];
                } else {
                  this.initialPath = ['site-extension-settings'];
                }
              }
              console.log('New path:', this.initialPath);


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

        this.comms = new CommsClient('popup-port', this.logAggregator, this.eventBus);
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
        this.startSitePolling();
      } catch (e) {
        console.error('[Popup.vue::created()] An error happened:', e)
      }
    },

    /**
     * Initializes page when it's being loaded as in-page settings window
     */
    async setupIframe() {
      try {
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

        console.log('does event bus exist yet?', this.eventBus);
        if (!this.eventBus) {
          // inter-frame communication should be set up by eventBus for free
          this.eventBus = new EventBus({name: 'ui-window'});
        }

        /**
         * Subscribe to event bus commands.
         * Note that showing and hiding of the settings window is no longer handled by iframe
         * Instead, uw-show-settings-window should be handled by the content-script.
         */
        this.eventBus.subscribeMulti({
          'set-current-site': {
            source: this,
            function: (config, context) => {
              console.warn('———————————————— received setCurrentSite!', config, context);

              if (this.site) {
                if (!this.site.host) {
                  // dunno why this fix is needed, but sometimes it is
                  this.site.host = config.site.host;
                }
              }
              this.site = {...config.site, from: 'set-current-site, via setup iframe'};
              this.siteSettings = this.settings.getSiteSettings({site: this.site.host});

              console.log('set-site received:', this.site, this.siteSettings, 'current path:', this.initialPath);
              if (!this.initialPath || this.initialPath.length < 1) {
                if (this.siteSettings.data.enable) {
                  this.initialPath = ['video-settings'];
                } else {
                  this.initialPath = ['site-extension-settings'];
                }
              }
              console.log('New path:', this.initialPath);


              // this.eventBus.setupPopupTunnelWorkaround({
              //   origin: CommsOrigin.Popup,
              //   comms: {
              //     forwardTo: 'active'
              //   }
              // });

              this.loadHostnames();
              this.loadFrames();
            }
          },
          'has-video': {
            function: (config, context) => {

              console.log('has video received.', config, context);
              console.log('———————— building site:', !config.isIFrame, this.site?.host, config.site, this.site?.host !== config.site);

              // update site data.
              // If we're here, then the settings page is being opened from the in-player popup.
              // This means that config.isIframe can generally be ignored.
              // However, we absolutely cannot accept iframes as source for this.site when we
              // open settings window from the extension popup. This needs to be TODO:
              if (this.site?.host !== config.site) {
                this.site = {
                  host: config.site,
                  frames: [],
                  hostnames: [],
                  from: 'has-video, via setup iframe. Settings: ' + !!this.settings + '; site settings: ' + !!this.settings.getSiteSettings({site: config.site.host}),
                };

                this.siteSettings = this.settings.getSiteSettings({site: this.site.host});
                this.loadHostnames();
                this.loadFrames();
              }

            }
          },
        });

        console.log('—————————————————————— polling from iframe window!!!!')
        this.startSitePolling();
        // this.eventBus.subscribe(
        //   'uw-show-settings-window',
        //   {
        //     source: this,
        //     function: () => {
        //       if (this.inPlayer) {
        //         return; // show-ui is only intended for global overlay
        //       }
        //     },
        //   }
        // )
      } catch (e) {
        console.error('Failed to initialize vue:', e);
      }
    },

    async startSitePolling() {
      while (true) {
        console.log('requesting site')
        this.requestSite();
        await this.sleep(5000);
      }
    },

    //#region EXTENSION POPUP

    showInPlayerUi() {
      this.eventBus.send('uw-show-settings-window', {initialState: undefined, allFrames: true}, {comms: {forwardTo: 'active'}});
    },
    async sleep(t) {
      return new Promise<void>( (resolve,reject) => {
        setTimeout(() => resolve(), t);
      });
    },
    toObject(obj) {
      return JSON.parse(JSON.stringify(obj));
    },
    requestSite() {
      try {
        this.logger.log('info','popup', '[popup::getSite] Requesting current site ...')
        console.info('sending get-current-site to eventBus')
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
    //#endregion
  }
});
</script>

