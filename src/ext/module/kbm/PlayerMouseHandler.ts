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
 * Maximum number of times per second that handleMouseMove / handleMouseZoom
 * are allowed to call eventBus.send. Each handler is limited independently.
 */
const MAX_SENDS_PER_SECOND = 10;
const MIN_SEND_INTERVAL_MS = 1000 / MAX_SENDS_PER_SECOND;

/**
 * Handles keypress
 */
export class MouseHandler extends KbmBase {
  listenFor: string[] = ['mousemove', 'wheel'];

  playerElement?: HTMLElement;

  //#region rate limiting state
  private lastMoveSendTime = 0;
  private pendingMovePosition?: { x: VideoAlignmentType, y: VideoAlignmentType, xPos: number, yPos: number };
  private moveTimeout?: ReturnType<typeof setTimeout>;

  private lastZoomSendTime = 0;
  private pendingZoom = 0;
  private zoomTimeout?: ReturnType<typeof setTimeout>;
  //#endregion

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

    // process what events are necessary to listen for, because we REALLY
    // don't want to listen for 'wheel' if we don't want to as that's a very
    // good way to get into CRASH CHROME TAB ANY% (WR)
    const events = [];
    if (
      this.settings.active.mouseOptions.shiftPan
      || this.settings.active.mouseOptions.ctrlPan
      || this.settings.active.ui.inPlayer.activateWithCtrl
    ) {
      events.push('mousemove');
    }
    if (this.settings.active.mouseOptions.shiftZoom) {
      events.push('wheel');
    }
    this.listenFor = events;

    this.addListener(this.playerElement);
  }

  destroy() {
    this.removeListener();
  }

  removeListener() {
    super.removeListener();
    this.clearPending();
  }

  /**
   * Cancels scheduled sends and discards any queued mouse movement/zoom.
   */
  private clearPending() {
    clearTimeout(this.moveTimeout);
    clearTimeout(this.zoomTimeout);
    this.moveTimeout = undefined;
    this.zoomTimeout = undefined;
    this.pendingMovePosition = undefined;
    this.pendingZoom = 0;
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

      // clientX/clientY are relative to the viewport, not to the player, so we have to
      // subtract player's position and use player's actual on-screen size.
      const rect = this.playerElement.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return;
      }

      const cursorPosition = {
        x: VideoAlignmentType.Custom,
        y: VideoAlignmentType.Custom,
        xPos: Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1),
        yPos: Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1),
      }

      this.sendMove(cursorPosition);
    }
  }

  /**
   * Sends alignment at most MAX_SENDS_PER_SECOND times per second. Position is
   * absolute, so if we have to drop events, the latest position is sent as
   * soon as the rate limit allows.
   */
  private sendMove(position: { x: VideoAlignmentType, y: VideoAlignmentType, xPos: number, yPos: number }) {
    this.pendingMovePosition = position;

    if (this.moveTimeout !== undefined) {
      // a send is already scheduled; it will pick up the latest position
      return;
    }

    const wait = this.lastMoveSendTime + MIN_SEND_INTERVAL_MS - performance.now();
    if (wait <= 0) {
      this.flushMove();
    } else {
      this.moveTimeout = setTimeout(() => this.flushMove(), wait);
    }
  }

  private flushMove() {
    this.moveTimeout = undefined;
    if (!this.pendingMovePosition) {
      return;
    }

    const position = this.pendingMovePosition;
    this.pendingMovePosition = undefined;
    this.lastMoveSendTime = performance.now();

    this.eventBus.send('set-alignment', position);
  }

  private handleMouseZoom(event: WheelEvent) {
    if (!this.playerElement || !this.settings.active.mouseOptions.shiftZoom) {
      return;
    }
    if (!event.shiftKey) {
      return;
    }

    const zoomAmount = (event.deltaY > 0 ? -0.01 : 0.01)
      * (this.settings.active.mouseOptions.invertZoom ? -1 : 1)
      * (isNaN(this.settings.active.mouseOptions.zoomSensitivity) ? 1 : this.settings.active.mouseOptions.zoomSensitivity ?? 1);

    this.sendZoom(zoomAmount);
  }

  /**
   * Sends zoom at most MAX_SENDS_PER_SECOND times per second. Zoom is relative,
   * so zoom from dropped events is accumulated and added onto the next event
   * that gets sent. If no further event arrives, the accumulated zoom is sent
   * once the rate limit allows, so it is never lost.
   */
  private sendZoom(zoomAmount: number) {
    this.pendingZoom += zoomAmount;

    if (this.zoomTimeout !== undefined) {
      // a send is already scheduled; it will pick up the accumulated zoom
      return;
    }

    const wait = this.lastZoomSendTime + MIN_SEND_INTERVAL_MS - performance.now();
    if (wait <= 0) {
      this.flushZoom();
    } else {
      this.zoomTimeout = setTimeout(() => this.flushZoom(), wait);
    }
  }

  private flushZoom() {
    this.zoomTimeout = undefined;
    if (this.pendingZoom === 0) {
      return;
    }

    const zoom = this.pendingZoom;
    this.pendingZoom = 0;
    this.lastZoomSendTime = performance.now();

    this.eventBus.send('change-zoom', { zoom });
  }
}
