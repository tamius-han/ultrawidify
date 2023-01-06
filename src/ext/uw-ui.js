// vue dependency imports
import { createApp } from 'vue';

// extension classes
import Logger from './lib/Logger';
import Settings from './lib/Settings';
import CommsClient from './lib/comms/CommsClient';
import Comms from './lib/comms/Comms';

class UwUi {

  constructor() {
    this.vueInitiated = false;
    // this.loggerUiInitiated = false;
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
        }

        // show popup if logging to file is enabled
        if (this.logger.isLoggingToFile()) {
          console.info('[uw::init] Logging to file is enabled. Will show popup!');
          try {
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

    // make sure we don't init twice
    this.vueInitiated = true;

    // let background script know it can proceed with sending 'show-logger' command.
    Comms.sendMessage({cmd: 'uwui-vue-initialized'});
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

