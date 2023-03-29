import Debug from './conf/Debug';
import ExtensionMode from '../common/enums/ExtensionMode.enum';
import Settings from './lib/Settings';
import Comms from './lib/comms/Comms';
import CommsClient from './lib/comms/CommsClient';
import PageInfo from './lib/video-data/PageInfo';
import Logger, { baseLoggingOptions } from './lib/Logger';
import UWGlobals from './lib/UWGlobals';
import EventBus from './lib/EventBus';
import KeyboardHandler from './lib/kbm/KeyboardHandler';
import { SiteSettings } from './lib/settings/SiteSettings';

export default class UWContent {
  pageInfo: PageInfo;
  comms: CommsClient;
  settings: Settings;
  siteSettings: SiteSettings;
  keyboardHandler: KeyboardHandler;
  logger: Logger;
  eventBus: EventBus;
  isIframe: boolean = false;

  commsHandlers: {
    [x: string]: ((a: any, b?: any) => void | Promise<void>)[]
  } = {
  }

  constructor(){
    this.isIframe = window.self !== window.top
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
        this.siteSettings = this.settings.getSiteSettings();
      }

      this.eventBus = new EventBus();
      this.eventBus.subscribe(
        'uw-restart',
        {
          function: () => this.initPhase2()
        }
      );
      this.eventBus.subscribe(
        'uw-show-ui',
        {
          function: () => {}
        }
      );
      this.comms = new CommsClient('content-main-port', this.logger, this.eventBus);
      this.eventBus.setComms(this.comms);


      this.initPhase2();
    } catch (e) {
      console.error('Ultrawidify initalization failed for some reason:', e);
    }
  }

  // we always initialize extension, even if it's disabled.
  initPhase2() {
    try {
      if (this.pageInfo) {
        this.logger.log('info', 'debug', '[uw.js::setup] An instance of pageInfo already exists and will be destroyed.');
        this.pageInfo.destroy();
      }
      this.pageInfo = new PageInfo(this.eventBus, this.siteSettings, this.settings, this.logger);
      this.logger.log('info', 'debug', "[uw.js::setup] pageInfo initialized.");

      this.logger.log('info', 'debug', "[uw.js::setup] will try to initate KeyboardHandler.");

      if (this.keyboardHandler) {
        this.keyboardHandler.destroy();
      }
      this.keyboardHandler = new KeyboardHandler(this.eventBus, this.siteSettings, this.settings, this.logger);
      this.keyboardHandler.init();

      this.logger.log('info', 'debug', "[uw.js::setup] KeyboardHandler initiated.");

    } catch (e) {
      console.error('Ultrawidify: failed to start extension. Error:', e)
      this.logger.log('error', 'debug', "[uw::init] FAILED TO START EXTENSION. Error:", e);
    }
  }

  destroy() {
    if (this.pageInfo) {
      this.pageInfo.destroy();
    }
    if (this.keyboardHandler) {
      this.keyboardHandler.destroy();
    }
  }
}
