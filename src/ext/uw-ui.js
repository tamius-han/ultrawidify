// vue dependency imports
import { createApp } from 'vue';
import { createStore } from 'vuex';
import VuexWebExtensions from 'vuex-webextensions';
import LoggerUi from '../csui/LoggerUi';

// extension classes
import Logger from './lib/Logger';
import Settings from './lib/Settings';
import CommsClient from './lib/comms/CommsClient';
import Comms from './lib/comms/Comms';
import mdiVue from 'mdi-vue/v3';
import * as mdijs from '@mdi/js';

class UwUi {

  constructor() {
    this.vueInitiated = false;
    this.loggerUiInitiated = false;
    this.playerUiInitiated = false;

    this.vuexStore = null;

    this.commsHandlers = {
      'show-logger': [() => this.showLogger()],
      'hide-logger': [() => this.hideLogger()],
      'emit-logs'  : [(message) => this.addLogs(message)]
    }
  }

  async init() {
    // IMPORTANT NOTICE — we do not check for whether extension is enabled or not,
    // since this script only gets executed either:
    //     * as a direct result of user action (logger UI)
    //     * if video/player is detected (which can only happen if extension is enabled
    //       for that particular site)

    // NOTE: we need to setup logger and comms _before_ initializing vue (unless we're starting)
    // because logger settings say we should

    // setup logger
    try {
      if (!this.logger) {
        const loggingOptions = {
          isContentScript: true,
          allowLogging: false,
          useConfFromStorage: true,
          fileOptions: {
            enabled: false
          },
          consoleOptions: {
            "enabled": false,
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
          this.initLoggerUi();
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

    // initialize vuejs, but only once (check handled in initVue())
    // we need to initialize this _after_ initializing comms.
    this.initVue();
  }

  initVue() {
    // never init twice
    if (this.vueInitiated) {
      // let background script know it can proceed with sending 'show-logger' command.
      Comms.sendMessage({cmd: 'uwui-vue-initialized'});
      return;
    }

    this.vuexStore = createStore({
        plugins: [
          VuexWebExtensions({
            persistentStates: [
              'uwLog',
              'showLogger',
              'loggingEnded',
            ],
          }),
        ],
        state: {
          uwLog: '',
          showLogger: false,
          loggingEnded: false,
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
          },
          'uw-logging-ended'(state) {
            state['loggingEnded'] = state;
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
          },
          'uw-logging-ended'({commit}, payload) {
            commit('uw-logging-ended', payload);
          }
        }
      });

    // make sure we don't init twice
    this.vueInitiated = true;

    // let background script know it can proceed with sending 'show-logger' command.
    Comms.sendMessage({cmd: 'uwui-vue-initialized'});
  }

  async initLoggerUi() {
    const random = Math.round(Math.random() * 69420);
    const uwid = `uw-ui-root-${random}`;

    const rootDiv = document.createElement('div');
    rootDiv.setAttribute("style", "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999999; pointer-events: none");
    rootDiv.setAttribute("id", uwid);
    rootDiv.classList.add('uw-ultrawidify-container-root');

    document.body.appendChild(rootDiv);

    try {
      createApp(LoggerUi)
        .use(this.vuexStore)
        .use(mdiVue, {icons: mdijs})
        .mount(`#${uwid}`);

      // new Vue({
      //   el: `#${uwid}`,
      //   components: {
      //     LoggerUi: LoggerUi
      //   },
      //   store: this.vuexStore,
      //   render(h) {
      //     return h('logger-ui');
      //   }
      // });
    } catch (e) {
      console.error("Error while initiating vue:", e)
    }

    this.loggerUiInitiated = true;
  }

  async showLogger() {
    console.log("show logger?")
    if (!this.loggerUiInitiated) {
      await this.initLoggerUi();
    }


    try {
      console.log("will show logger")
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

  addLogs(message) {
    this.logger.appendLog(JSON.parse(message.payload));

    // since this gets called _after_ logging has been finished,
    // we also inform logger UI to save current settings
    if (this.vueInitiated && this.vuexStore !== undefined) {
      console.log("got add logs. payload:", message.payload);
      this.vuexStore.dispatch('uw-logging-ended', true);
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
} else {
  // let background script know it can proceed with sending 'show-logger' command.
  Comms.sendMessage({cmd: 'uwui-vue-initialized'});
}

