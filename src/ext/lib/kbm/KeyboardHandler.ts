import ExtensionMode from '../../../common/enums/ExtensionMode.enum';
import Settings from '../settings/Settings';
import EventBus, { EventBusCommand } from '../EventBus';
import KbmBase from './KbmBase';
import { SiteSettings } from '../settings/SiteSettings';
import { LogAggregator } from '../logging/LogAggregator';
import { ComponentLogger } from '../logging/ComponentLogger';
import { InputHandlingMode } from '../../../common/enums/InputHandlingMode.enum';

if(process.env.CHANNEL !== 'stable'){
  console.info("Loading KeyboardHandler");
}

const BASE_LOGGING_STYLES = {
  log: "color: #ff0"
};

/**
 * Handles keypresses and mouse movement.
 *
 * EventBus commands:
 *    kbm-enable        enables keyboard shortcuts and mouse panning
 *    kbm-disable       disables keyboard shortcuts and mouse panning
 *    kbm-set-config    sets configuration for this module.
 */
export class KeyboardHandler extends KbmBase {
  listenFor: string[] = ['keyup'];
  playerElements: HTMLElement[] = [];


  allowShortcuts: boolean = true;


  inputs: string[] = ['input', 'select', 'button', 'textarea'];
  keyboardLocalDisabled: boolean = false;

  mouseMoveActions: any[] = [];
  keypressActions: any[] = [];

  eventBusCommands: { [x: string]: EventBusCommand } = {

  }

  //#region lifecycle
  constructor(eventBus: EventBus, siteSettings: SiteSettings, settings: Settings, logAggregator: LogAggregator) {
    const tmpLogger = new ComponentLogger(logAggregator, 'KeyboardHandler', {styles: BASE_LOGGING_STYLES});
    super(eventBus, siteSettings, settings, tmpLogger);
    this.init();
  }

  init() {
    this.logger.debug("init", "starting init");

    // reset keypressActions when re-initializing, otherwise keypressActions will
    // multiply in an unwanted way
    this.keypressActions = [];

    // build the action list — but only from actions that have shortcuts assigned
    for (const key in this.settings.active.commands) {
      for (const command of this.settings.active.commands[key]) {
        if (command.shortcut) {
          this.keypressActions.push(command);
        }
      }
    }

    this.load();
  }

  destroy() {
    this.removeListener();
  }

  /**
   * Adds listeners for mouse events, for all player elements associated with the KeyboardHandler instance.
   * @param element
   */
  addMouseListeners(element?: HTMLElement) {
    if (element) {
      this.playerElements.push(element);

      if (this.settings.active.kbm.mouseEnabled) {
        element.addEventListener('mousemove', this);
      }
    } else {
      if (this.settings.active.kbm.mouseEnabled) {
        for (const playerElement of this.playerElements) {
          playerElement.addEventListener('mousemove', this);
        }
      }
    }
  }
  //#endregion

  /**
   * Current instance needs this method for document.addEventListener('keyup', this) to work
   * @param event
   */
  handleEvent(event) {
    if (this.siteSettings?.data.enableKeyboard === InputHandlingMode.Disabled) {
      return;
    }
    if (this.preventAction(event)) {
      this.logger.info('handleKeyup', "we are in a text box or something. Doing nothing.");
      return;
    }

    const command = this.hasAction(event);

    if (!command) {
      return;
    }

    if (event.type === 'keyup') {
      this.eventBus.send(command.action, command.arguments);
    }

    // Doesn't appear to achieve anything on youtube
    // if (this.siteSettings.data.enableKeyboard === InputHandlingMode.Force) {
    //   event.preventDefault();
    //   event.stopPropagation();
    //   event.stopImmediatePropagation();
    // }
  }

  setKeyboardLocal(state: ExtensionMode) {
    if (state === ExtensionMode.All) {
      this.keyboardLocalDisabled = false;
    } else if (state === ExtensionMode.Disabled) {
      this.keyboardLocalDisabled = true;
    }
    // don't do shit on invalid value of state
  }

  preventAction(event) {
    var activeElement = document.activeElement;

    if (this.keyboardLocalDisabled) {
      return true;
    }
    if (this.inputs.indexOf(activeElement.tagName.toLocaleLowerCase()) !== -1) {
      return true;
    }
    if (activeElement.getAttribute("role") === "textbox") {
      return true;
    }
    if (event.target.isContentEditable) {
      return true;
    }
    if (activeElement.getAttribute("type") === "text") {
      return true;
    }
    return false;
  }

  ghettoLocalizeKeyboardEvent(event: KeyboardEvent) {
    const realKey = event.key.toLocaleUpperCase();
    const isLatin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'.indexOf(realKey) !== -1;

    if (!isLatin) {
      return event;
    }

    const nativeKey = event.code.substring(3);

    if (nativeKey !== realKey) {
      return {
        ...event,
        code: `Key${realKey}`
      };
    }

    return event;
  }


  isLatin(key) {
    return 'abcdefghijklmnopqrstuvwxyz1234567890'.indexOf(key.toLocaleLowerCase()) !== -1;
  }

  isActionMatchStandard(shortcut, event) {
    return shortcut.key      === event.key     &&
         !!shortcut.ctrlKey  === event.ctrlKey &&
         !!shortcut.metaKey  === event.metaKey &&
         !!shortcut.altKey   === event.altKey  &&
         !!shortcut.shiftKey === event.shiftKey;
  }
  isActionMatchKeyCode(shortcut, event) {
    return shortcut.code     === event.code    &&
         !!shortcut.ctrlKey  === event.ctrlKey &&
         !!shortcut.metaKey  === event.metaKey &&
         !!shortcut.altKey   === event.altKey  &&
         !!shortcut.shiftKey === event.shiftKey
  }

  isActionMatch(shortcut, event, isLatin = true) {
    // ASCII and symbols fall back to key code matching, because we don't know for sure that
    // regular matching by key is going to work
    return isLatin ?
      this.isActionMatchStandard(shortcut, event) :
      this.isActionMatchStandard(shortcut, event) || this.isActionMatchKeyCode(shortcut, event);
  }


  private _actionCache: any = {};
  hasAction(event) {
    const actionHash = `${event.code}-${event.ctrlKey ? 1 : 0}${event.shiftKey ? 1 : 0}${event.altKey ? 1 : 0}${event.metaKey ? 1 : 0}${event.key}`;

    if (this._actionCache[actionHash] !== undefined) {
      return this._actionCache[actionHash];
    }

    const isLatin = this.isLatin(event.key.toLowerCase());

    for (const command of this.keypressActions) {
      if (this.isActionMatch(command.shortcut, event, isLatin)) {
        this._actionCache[actionHash] = command;
        return command;
      }
    }

    this._actionCache[actionHash] = false;
    return false;
  }

  load() {
    this._actionCache = {};
    super.load();
  }
}

if(process.env.CHANNEL !== 'stable'){
  console.info("KeyboardHandler loaded");
}

export default KeyboardHandler;
