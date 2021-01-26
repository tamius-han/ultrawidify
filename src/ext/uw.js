import Debug from './conf/Debug';
import BrowserDetect from './conf/BrowserDetect';
import ExtensionMode from '../common/enums/extension-mode.enum';
import Settings from './lib/Settings';
import ActionHandler from './lib/ActionHandler';
import Comms from './lib/comms/Comms';
import CommsClient from './lib/comms/CommsClient';
import PageInfo from './lib/video-data/PageInfo';
import Logger from './lib/Logger';
import UWGlobals from './lib/UWGlobals';


if(process.env.CHANNEL !== 'stable'){
  console.warn("\n\n\n\n\n\n           ———    Sᴛλʀᴛɪɴɢ  Uʟᴛʀᴀᴡɪᴅɪꜰʏ    ———\n               <<   ʟᴏᴀᴅɪɴɢ ᴍᴀɪɴ ꜰɪʟᴇ   >>\n\n\n\n");
  try {
    if(window.self !== window.top){
      console.info("%cWe aren't in an iframe.", "color: #afc, background: #174");
    }
    else{
      console.info("%cWe are in an iframe!", "color: #fea, background: #d31", window.self, window.top);
    }
  } catch (e) {
    console.info("%cWe are in an iframe!", "color: #fea, background: #d31");
  }
}

if (BrowserDetect.edge) {
  HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
}

class UW {
  constructor(){
    this.pageInfo = undefined;
    this.comms = undefined;
    this.settings = undefined;
    this.actionHandler = undefined;
    this.logger = undefined;
    this.uiInitiated = false;

    this.commsHandlers = {
      'get-current-zoom': [() => this.pageInfo.requestCurrentZoom()],
      'set-ar': [(message) => this.pageInfo.setAr({type: message.arg, ratio: message.customArg}, message.playing)],
      'set-alignment': [(message) => {
        this.pageInfo.setVideoAlignment(message.arg, message.playing);
        this.pageInfo.restoreAr();
      }],
      'set-stretch': [(message) => this.pageInfo.setStretchMode(message.arg, message.playing, message.customArg)],
      'set-keyboard': [(message) => this.pageInfo.setKeyboardShortcutsEnabled(message.arg)],
      'autoar-start': [(message) => {
        if (message.enabled !== false) {
          this.pageInfo.initArDetection(message.playing);
          this.pageInfo.startArDetection(message.playing);
        } else {
          this.pageInfo.stopArDetection(message.playing);
        }
      }],
      'pause-processing': [(message) => this.pageInfo.pauseProcessing(message.playing)],
      'resume-processing': [(message) => this.pageInfo.resumeProcessing(message.autoArStatus, message.playing)],
      'set-zoom': [(message) => this.pageInfo.setZoom(message.arg, true, message.playing)],
      'change-zoom': [(message) => this.pageInfo.zoomStep(message.arg, message.playing)],
      'mark-player': [(message) => this.pageInfo.markPlayer(message.name, message.color)],
      'unmark-player': [() => this.pageInfo.unmarkPlayer()],
      'autoar-set-manual-tick': [(message) => this.pageInfo.setManualTick(message.arg)],
      'autoar-tick': [() => this.pageInfo.tick()],
      'set-ar-persistence': [() => this.pageInfo.setArPersistence(message.arg)], 
    }
  }

  createUWGlobals() {
    if (window.ultrawidify) {
      window.ultrawidify.destroy();
    }

    window.ultrawidify = new UWGlobals();
  }

  reloadSettings() {
    this.logger.log('info', 'debug', 'Things happened in the popup. Will reload extension settings.');
    this.init();
  }

  async init(){
    if (Debug.debug) {
      console.log("[uw::main] loading configuration ...");
    }

    this.createUWGlobals();
  
    // logger init is the first thing that needs to run
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

        // show popup if logging to file is enabled
        if (this.logger.isLoggingAllowed() && this.logger.isLoggingToFile()) {
          console.info("[uw::init] Logging is allowed! Initalizing vue and UI!");

          // CommsClient is not initiated yet, so we use static comms to send the command
          Comms.sendMessage({cmd: 'show-logger'});
        }
      }
    } catch (e) {
      console.error("logger init failed!", e)
    }

    // init() is re-run any time settings change
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
  
    this.comms = new CommsClient('content-main-port', this.logger, this.commsHandlers);

    // če smo razširitev onemogočili v nastavitvah, ne naredimo ničesar
    // If extension is soft-disabled, don't do shit

    var extensionMode = this.settings.getExtensionMode();

    this.logger.log('info', 'debug', "[uw::init] Extension mode:" + (extensionMode < 0 ? "disabled" : extensionMode == '1' ? 'basic' : 'full'));

    const isSiteDisabled = extensionMode === ExtensionMode.Disabled

    if (isSiteDisabled) {
      if (this.settings.getExtensionMode('@global') === ExtensionMode.Disabled) {
        this.logger.log('info', 'debug', "[uw::init] EXTENSION DISABLED, THEREFORE WONT BE STARTED")
        return;
      }
    }
  
    try {
      if (this.pageInfo) {
        this.logger.log('info', 'debug', '[uw.js::setup] An instance of pageInfo already exists and will be destroyed.');
        this.pageInfo.destroy();
      }
      this.pageInfo = new PageInfo(this.comms, this.settings, this.logger, extensionMode, isSiteDisabled);
      this.logger.log('info', 'debug', "[uw.js::setup] pageInfo initialized.");
  
      this.logger.log('info', 'debug', "[uw.js::setup] will try to initate ActionHandler.");

      // start action handler only if extension is enabled for this site
      if (!isSiteDisabled) {
        if (this.actionHandler) {
          this.actionHandler.destroy();
        }
        this.actionHandler = new ActionHandler(this.pageInfo);
        this.actionHandler.init();
        
        this.logger.log('info', 'debug', "[uw.js::setup] ActionHandler initiated.");
      }

    } catch (e) {
      this.logger.log('error', 'debug', "[uw::init] FAILED TO START EXTENSION. Error:", e);
    }
  }
}

var main = new UW();
main.init();
