import EventBus, { EventBusCommand } from '../EventBus';
import Logger from '../Logger';
import Settings from '../Settings';

if(process.env.CHANNEL !== 'stable'){
  console.info("Loading PlayerMouseHandler");
}


/**
 * Handles keypress
 */
export class MouseHandler {
  logger: Logger;
  settings: Settings;
  eventBus: EventBus;
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
  constructor(playerElement: HTMLElement, eventBus: EventBus, settings: Settings, logger: Logger) {
    this.logger = logger;
    this.settings = settings;
    this.eventBus = eventBus;
    this.playerElement = playerElement;

    this.init();
  }

  init() {
    this.logger.log('info', 'debug', '[MouseHandler::init] starting init');
  }

  load() {
    if (!this.settings.isEnabledForSite() || this.settings.active.kbm.enabled) {
      return;
    }

    this.addListener();
  }

  destroy() {
    this.removeListener();
  }
  //#endregion

  //#region listener setup, teardown, handling
  private addListener() {
    if (this.settings.active.kbm.enabled && this.settings.active.kbm.mouseEnabled) {
      this.playerElement.addEventListener('mousemove', this);
    }
  }

  private removeListener() {
    this.playerElement.removeEventListener('mousemove', this);
  }

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

  private setConfig(config, isTemporary?) {

  }



  private handleMouseMove(event: MouseEvent) {

  }
}
