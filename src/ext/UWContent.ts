import Debug from '@src/ext/conf/Debug';
import CommsClient from '@src/ext/module/comms/CommsClient';
import EventBus from '@src/ext/module/EventBus';
import KeyboardHandler from '@src/ext/module/kbm/KeyboardHandler';
import { ComponentLogger } from '@src/ext/module/logging/ComponentLogger';
import { BLANK_LOGGER_CONFIG, LogAggregator } from '@src/ext/module/logging/LogAggregator';
import Settings from '@src/ext/module/settings/Settings';
import { SiteSettings } from '@src/ext/module/settings/SiteSettings';
import UI from '@src/ext/module/uwui/UI';
import PageInfo from '@src/ext/module/video-data/PageInfo';
import { getIframeParentHost, setupHostnameReporting } from '@src/ext/util/getHost';

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

      this.eventBus = new EventBus({name: 'content-script'});
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

      this.logger.debug('setup', "will try to initiate KeyboardHandler.");

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
