import { LogAggregator } from '../logging/LogAggregator';
import EventBus, { EventBusCommand } from '../EventBus';
import { ComponentLogger } from '../logging/ComponentLogger';
import Settings from '../settings/Settings';
import { SiteSettings } from '../settings/SiteSettings';
import KbmBase from './KbmBase';
import VideoAlignmentType from '@src/common/enums/VideoAlignmentType.enum';

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
  listenFor: string[] = ['mousemove', 'wheel'];

  playerElement?: HTMLElement;

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
  constructor(playerElement: HTMLElement | undefined, eventBus: EventBus, siteSettings: SiteSettings, settings: Settings, logAggregator: LogAggregator) {
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

  updatePlayerElement(playerElement?: HTMLElement) {
    this.removeListener();

    if (!playerElement) {
      return;
    }
    this.playerElement = playerElement;
    this.load();
  }

  load() {
    // todo: process whether mouse movement should be enabled or disabled
    if (!this.playerElement) {
      return;
    }
    this.addListener(this.playerElement);
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
        break;
      case 'wheel':
        this.handleMouseZoom(event as WheelEvent)
        break;
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
    const both = this.settings.active.mouseOptions.shiftPan && this.settings.active.mouseOptions.ctrlPan;

    if (
      (both && event.shiftKey && event.ctrlKey)
      || (
        !both && (
          (this.settings.active.mouseOptions.shiftPan && event.shiftKey)
          || (this.settings.active.mouseOptions.ctrlPan && event.ctrlKey)
        )
      )
    ) {
      if (!this.playerElement) {
        return;
      }

      const cursorPosition = {
        x: VideoAlignmentType.Custom,
        y: VideoAlignmentType.Custom,
        xPos: event.clientX / this.playerElement.scrollWidth,
        yPos: event.clientY / this.playerElement.scrollHeight,
      }

      this.eventBus.send(
        'set-alignment',
        cursorPosition
      );
    }
  }

  private handleMouseZoom(event: WheelEvent) {
    if (!this.playerElement) {
      return;
    }

    const zoomAmount = (event.deltaY > 0 ? -0.01 : 0.01)
      * (this.settings.active.mouseOptions.invertZoom ? -1 : 1)
      * (isNaN(this.settings.active.mouseOptions.zoomSensitivity) ? 1 : this.settings.active.mouseOptions.zoomSensitivity ?? 1);

    this.eventBus.send(
      'change-zoom',
      { zoom: zoomAmount }
    );
  }
}
