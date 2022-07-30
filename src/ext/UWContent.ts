import Debug from './conf/Debug';
import ExtensionMode from '../common/enums/ExtensionMode.enum';
import Settings from './lib/Settings';
import ActionHandler from './lib/ActionHandler';
import Comms from './lib/comms/Comms';
import CommsClient from './lib/comms/CommsClient';
import PageInfo from './lib/video-data/PageInfo';
import Logger, { baseLoggingOptions } from './lib/Logger';
import UWGlobals from './lib/UWGlobals';
import EventBus from './lib/EventBus';

export default class UWContent {
  pageInfo: PageInfo;
  comms: CommsClient;
  settings: Settings;
  actionHandler: ActionHandler;
  logger: Logger;
  eventBus: EventBus;

  commsHandlers: {
    [x: string]: ((a: any, b?: any) => void | Promise<void>)[]
  } = {
    // THIS SHOULD BE MIGRATED TO EVENT BUS
    // 'get-current-zoom': [() => this.pageInfo.requestCurrentZoom()],
    // 'set-ar': [(message) => this.pageInfo.setAr({type: message.arg, ratio: message.customArg}, message.playing)],
    // 'set-alignment': [(message) => {
    //   this.pageInfo.setVideoAlignment(message.arg, message.playing);
    //   this.pageInfo.restoreAr();
    // }],
    // 'set-stretch': [(message) => this.pageInfo.setStretchMode(message.arg, message.playing, message.customArg)],
    // 'set-keyboard': [(message) => this.pageInfo.setKeyboardShortcutsEnabled(message.arg)],
    // DEPRECATED — should be set with resizer.setAr()
    // 'autoar-start': [(message) => {
    //   if (message.enabled !== false) {
    //     this.pageInfo.initArDetection(message.playing);
    //     this.pageInfo.startArDetection(message.playing);
    //   } else {
    //     this.pageInfo.stopArDetection(message.playing);
    //   }
    // }],
    // 'pause-processing': [(message) => this.pageInfo.pauseProcessing(message.playing)],
    // 'resume-processing': [(message) => this.pageInfo.resumeProcessing(message.autoArStatus, message.playing)],
    // 'set-zoom': [(message) => this.pageInfo.setZoom(message.arg, true, message.playing)],
    // 'change-zoom': [(message) => this.pageInfo.zoomStep(message.arg, message.playing)],
    // 'mark-player': [(message) => this.pageInfo.markPlayer(message.name, message.color)],
    // 'unmark-player': [() => this.pageInfo.unmarkPlayer()],
    // 'autoar-set-manual-tick': [(message) => this.pageInfo.setManualTick(message.arg)],
    // 'autoar-tick': [() => this.pageInfo.tick()],
    // 'set-ar-persistence': [(message) => this.pageInfo.setArPersistence(message.arg)],
  }

  constructor(){
  }

  reloadSettings() {
    try {
      this.logger.log('info', 'debug', 'Things happened in the popup. Will reload extension settings.');
      this.init();
    } catch (e) {
      console.warn('Ultrawidify: settings reload failed. This probably shouldn\'t outright kill the extension, but page reload is recommended.');
    }
  }

  async init(){
    try {
      if (Debug.debug) {
        console.log("[uw::main] loading configuration ...");
      }

      // logger init is the first thing that needs to run
      try {
        if (!this.logger) {
          this.logger = new Logger();
          await this.logger.init(baseLoggingOptions);
        }
      } catch (e) {
        console.error("logger init failed!", e)
      }

      // init() is re-run any time settings change
      if (this.comms) {
        this.comms.destroy();
      }
      if (this.eventBus) {
        this.eventBus.destroy();
      }
      if (!this.settings) {
        this.settings = new Settings({
          onSettingsChanged: () => this.reloadSettings(),
          logger: this.logger
        });
        await this.settings.init();
      }

      this.eventBus = new EventBus();
      this.eventBus.subscribe(
        'uw-restart',
        {
          function: () => this.initPhase2()
        }
      );
      this.comms = new CommsClient('content-main-port', this.logger, this.eventBus);
      this.eventBus.setComms(this.comms);


      this.initPhase2();
    } catch (e) {
      console.error('Ultrawidify initalization failed for some reason:', e);
    }
  }

  initPhase2() {
    // If extension is soft-disabled, don't do shit
    var extensionMode = this.settings.getExtensionMode();

    this.logger.log('info', 'debug', "[uw::init] Extension mode:" + (extensionMode < 0 ? "disabled" : extensionMode == '1' ? 'basic' : 'full'));

    const isSiteDisabled = extensionMode === ExtensionMode.Disabled

    if (isSiteDisabled) {
      this.destroy();
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
      this.pageInfo = new PageInfo(this.eventBus, this.settings, this.logger, extensionMode, isSiteDisabled);
      this.logger.log('info', 'debug', "[uw.js::setup] pageInfo initialized.");

      this.logger.log('info', 'debug', "[uw.js::setup] will try to initate ActionHandler.");

      // start action handler only if extension is enabled for this site
      if (!isSiteDisabled) {
        if (this.actionHandler) {
          this.actionHandler.destroy();
        }
        this.actionHandler = new ActionHandler(this.eventBus, this.settings, this.logger);
        this.actionHandler.init();

        this.logger.log('info', 'debug', "[uw.js::setup] ActionHandler initiated.");
      }

    } catch (e) {
      console.error('Ultrawidify: failed to start extension. Error:', e)
      this.logger.log('error', 'debug', "[uw::init] FAILED TO START EXTENSION. Error:", e);
    }
  }

  destroy() {
    if (this.pageInfo) {
      this.pageInfo.destroy();
    }
    if (this.actionHandler) {
      this.actionHandler.destroy();
    }
  }
}
