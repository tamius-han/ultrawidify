import { LogAggregator } from '../logging/LogAggregator';
import EventBus, { EventBusCommand } from '../EventBus';
import { ComponentLogger } from '../logging/ComponentLogger';
import Settings from '../settings/Settings';
import { SiteSettings } from '../settings/SiteSettings';
import KbmBase from './KbmBase';

if(process.env.CHANNEL !== 'stable'){
  console.info("Loading PlayerMouseHandler");
}


const BASE_LOGGING_STYLES = {
  log: "color: #ff0"
};

/**
 * Handles keypress
 */
export class MouseHandler extends KbmBase {
  listenFor: string[] = ['mousemove'];

  playerElement: HTMLElement;

  eventBusCommands: { [x: string]: EventBusCommand } = {
    'kbm-enable': {
      function: () => this.enable()
    },
    'kbm-disable': {
      function: () => this.disable()
    },
    'kbm-set-config': {
      function: (data: {config: any, temporary?: boolean}) => this.setConfig(data.config, data.temporary),
    },
    'uw-enable': {
      function: () => this.load()
    },
    'uw-disable': {
      function: () => this.disable()
    },
  }

  //#region lifecycle
  constructor(playerElement: HTMLElement, eventBus: EventBus, siteSettings: SiteSettings, settings: Settings, logAggregator: LogAggregator) {
    const tmpLogger = new ComponentLogger(logAggregator, 'MouseHandler', {styles: BASE_LOGGING_STYLES});

    super(eventBus, siteSettings, settings, tmpLogger);

    this.settings = settings;
    this.siteSettings = siteSettings;
    this.eventBus = eventBus;
    this.playerElement = playerElement;

    this.init();
  }

  init() {
    // this.logger.debug('init', 'starting init');
  }

  load() {
    // todo: process whether mouse movement should be enabled or disabled
    this.addListener();
  }

  destroy() {
    this.removeListener();
  }
  //#endregion

  //#region listener setup, teardown, handling
  handleEvent(event: MouseEvent) {
    switch (event.type) {
      case 'mousemove':
        this.handleMouseMove(event)
    }
  }
  //#endregion

  enable() {
    this.load();
  }

  disable() {
    this.removeListener();
  }

  private handleMouseMove(event: MouseEvent) {

  }
}
