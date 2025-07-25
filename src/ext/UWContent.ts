import Debug from './conf/Debug';
import Settings from './lib/settings/Settings';
import CommsClient from './lib/comms/CommsClient';
import PageInfo from './lib/video-data/PageInfo';
import EventBus from './lib/EventBus';
import KeyboardHandler from './lib/kbm/KeyboardHandler';
import { SiteSettings } from './lib/settings/SiteSettings';
import UI from './lib/uwui/UI';
import { BLANK_LOGGER_CONFIG, LogAggregator } from './lib/logging/LogAggregator';
import { ComponentLogger } from './lib/logging/ComponentLogger';
import { getIframeParentHost, setupHostnameReporting } from './util/getHost';

export default class UWContent {
  pageInfo: PageInfo;
  comms: CommsClient;
  settings: Settings;
  siteSettings: SiteSettings;
  keyboardHandler: KeyboardHandler;
  logAggregator: LogAggregator;
  logger: ComponentLogger;
  eventBus: EventBus;
  isIframe: boolean = false;
  parentHostname: string;

  globalUi: any;

  commsHandlers: {
    [x: string]: ((a: any, b?: any) => void | Promise<void>)[]
  } = {
  }

  constructor(){
    setupHostnameReporting();
    this.isIframe = window.self !== window.top;
  }

  reloadSettings() {
    try {
      this.logger.debug('reloadSettings', 'Things happened in the popup. Will reload extension settings.');
      this.init();
    } catch (e) {
      console.warn('Ultrawidify: settings reload failed. This probably shouldn\'t outright kill the extension, but page reload is recommended.');
    }
  }

  async init(){
    if (this.isIframe) {
      this.parentHostname = await getIframeParentHost();
      console.warn('[uw-content] got iframe parent:', this.parentHostname);
    }

    try {
      if (Debug.debug) {
        console.log("[uw::main] loading configuration ...");
      }

      // logger init is the first thing that needs to run
      try {
        if (!this.logger) {
          this.logAggregator = new LogAggregator('◈');
          this.logger = new ComponentLogger(this.logAggregator, 'UWContent');
          await this.logAggregator.init(BLANK_LOGGER_CONFIG);
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
          logAggregator: this.logAggregator
        });
        await this.settings.init();
        this.siteSettings = this.settings.getSiteSettings({site: window.location.hostname, isIframe: this.isIframe, parentHostname: this.parentHostname});
      }

      this.eventBus = new EventBus();
      this.eventBus.subscribe(
        'uw-restart',
        {
          source: this,
          function: () => this.initPhase2()
        }
      );
      this.comms = new CommsClient('content-main-port', this.logAggregator, this.eventBus);
      this.eventBus.setComms(this.comms);


      this.initPhase2();
    } catch (e) {
      console.error('Ultrawidify initialization failed for some reason:', e);
    }
  }

  // we always initialize extension, even if it's disabled.
  initPhase2() {
    try {
      if (this.pageInfo) {
        this.logger.info('setup', 'An instance of pageInfo already exists and will be destroyed.');
        this.pageInfo.destroy();
      }
      this.pageInfo = new PageInfo(this.eventBus, this.siteSettings, this.settings, this.logAggregator);
      this.logger.debug('setup', "pageInfo initialized.");

      this.logger.debug('setup', "will try to initate KeyboardHandler.");

      if (this.keyboardHandler) {
        this.keyboardHandler.destroy();
      }
      this.keyboardHandler = new KeyboardHandler(this.eventBus, this.siteSettings, this.settings, this.logAggregator);
      this.keyboardHandler.init();

      this.logger.debug('setup', "KeyboardHandler initiated.");

      this.globalUi = new UI('ultrawidify-global-ui', {eventBus: this.eventBus, isGlobal: true});
      this.globalUi.enable();
      this.globalUi.setUiVisibility(false);

    } catch (e) {
      console.error('Ultrawidify: failed to start extension. Error:', e)
      this.logger.error('setup', "FAILED TO START EXTENSION. Error:", e);
    }
  }

  destroy() {
    this.eventBus.unsubscribeAll(this);
    if (this.pageInfo) {
      this.pageInfo.destroy();
    }
    if (this.keyboardHandler) {
      this.keyboardHandler.destroy();
    }
  }
}
