// vue dependency imports
import Vue from 'vue';
import Vuex from 'vuex';
import VuexWebExtensions from 'vuex-webextensions';
import LoggerUi from '../csui/LoggerUi';

// extension classes
import Logger from './lib/Logger';
import Settings from './lib/Settings';
import CommsClient from './lib/comms/CommsClient';

class UwUi {

  constructor() {
    this.vueInitiated = false;
    this.loggerUiInitiated = false;
    this.playerUiInitiated = false;

    this.vuexStore = null;

    this.commsHandlers = {
      'show-logger': [() => this.showLogger()],
      'hide-logger': [() => this.hideLogger()],
    }
  }

  async init() {
    // IMPORTANT NOTICE — we do not check for whether extension is enabled or not,
    // since this script only gets executed either:
    //     * as a direct result of user action (logger UI)
    //     * if video/player is detected (which can only happen if extension is enabled
    //       for that particular site)

    // initialize vuejs, but only once (check handled in initVue())
    this.initVue();

    // setup logger
    try {
      if (!this.logger) {
        const loggingOptions = {
          isContentScript: true,
          allowLogging: true,
          useConfFromStorage: true,
          fileOptions: {
            enabled: false
          },
          consoleOptions: {
            "enabled": true,
            "debug": true,
            "init": true,
            "settings": true,
            "keyboard": true,
            "mousemove": false,
            "actionHandler": true,
            "comms": true,
            "playerDetect": true,
            "resizer": true,
            "scaler": true,
            "stretcher": true,
            // "videoRescan": true,
            // "playerRescan": true,
            "arDetect": true,
            "arDetect_verbose": true
          },
          allowBlacklistedOrigins: {
            'periodicPlayerCheck': false,
            'periodicVideoStyleChangeCheck': false,
            'handleMouseMove': false
          }
        };
        this.logger = new Logger();
        await this.logger.init(loggingOptions);

        if (this.logger.isLoggingAllowed()) {
          console.info("[uw::init] Logging is allowed! Initalizing vue and UI!");
          this.initVue();
          this.initUi();
          this.logger.setVuexStore(this.vuexStore);
        }

        // show popup if logging to file is enabled
        if (this.logger.isLoggingToFile()) {
          console.info('[uw::init] Logging to file is enabled. Will show popup!');
          try {
            this.vuexStore.dispatch('uw-show-logger');
          } catch (e) {
            console.error('[uw::init] Failed to open popup!', e)
          }
        }
      }
    } catch (e) {
      console.error("logger initialization failed. Error:", e);
    }

    // we also need to know settings (there's UI-related things in the settings — or rather, there will be UI-related things
    // in settings once in-player UI is implemented
    // If comms exist, we need to destroy it
    if (this.comms) {
      this.comms.destroy();
    }
    if (!this.settings) {
      this.settings = new Settings({
        onSettingsChanged: () => this.reloadSettings(),
        logger: this.logger
      });
      await this.settings.init();
    }

    this.comms = new CommsClient('content-ui-port', this.logger, this.commsHandlers);
  }

  initVue() {
    // never init twice
    if (this.vueInitiated) {
      return;
    }

    Vue.prototype.$browser = global.browser;
    Vue.use(Vuex);
    this.vuexStore = new Vuex.Store({
      plugins: [VuexWebExtensions({
        persistentStates: [
          'uwLog',
          'showLogger',
        ],
      })],
      state: {
        uwLog: '',
        showLogger: false,
      },
      mutations: {
        'uw-set-log'(state, payload) {
          state['uwLog'] = payload;
        },
        'uw-show-logger'(state) {
          state['showLogger'] = true;
        },
        'uw-hide-logger'(state) {
          state['showLogger'] = false;
        }
      },
      actions: {
        'uw-set-log' ({commit}, payload) {
          commit('uw-set-log', payload);
        },
        'uw-show-logger'({commit}) {
          commit('uw-show-logger');
        },
        'uw-hide-logger'({commit}) {
          commit('uw-hide-logger');
        }
      }
    });

    // make sure we don't init twice
    this.vueInitiated = true;
  }

  async initLoggerUi() {
    const random = Math.round(Math.random() * 69420);
    const uwid = `uw-ui-root-${random}`;

    const rootDiv = document.createElement('div');
    rootDiv.setAttribute("style", "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999999; background-color: #ff0000;");
    rootDiv.setAttribute("id", uwid);

    document.body.appendChild(rootDiv);
   
    try {
      new Vue({
        el: `#${uwid}`,
        components: {
          LoggerUi: LoggerUi
        },
        store: this.vuexStore,
        render(h) {
          return h('logger-ui');
        }
      });
    } catch (e) {
      console.error("Error while initiating vue:", e)
    }

    this.loggerUiInitiated = true;
  }

  async showLogger() {
    if (!this.loggerUiInitiated) {
      await this.initLoggerUi();
    }
    
    try {
      this.vuexStore.dispatch('uw-show-logger');
    } catch (e) {
      console.error('Failed to dispatch vuex store', e)
    }
  }
  hideLogger() {
    if (this.vueInitiated && this.vuexStore !== undefined) {
      this.vuexStore.dispatch('uw-hide-logger');
    }
  }
}

// leave a mark, so this script won't get executed more than once on a given page
const markerId = 'ultrawidify-marker-5aeaf521-7afe-447f-9a17-3428f62d0970';

// if this script has already been executed, don't execute it again. 
if (! document.getElementById(markerId)) {
  const markerDiv = document.createElement('div');
  markerDiv.setAttribute("style", "display: none");
  markerDiv.setAttribute('id', markerId);

  document.body.appendChild(markerDiv);

  const uwui = new UwUi();
  uwui.init();
}

