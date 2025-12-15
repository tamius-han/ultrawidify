import ExtensionMode from '../../../common/enums/ExtensionMode.enum';
import Settings from '../settings/Settings';
import EventBus, { EventBusCommand } from '../EventBus';
import KbmBase from './KbmBase';
import { SiteSettings } from '../settings/SiteSettings';
import { LogAggregator } from '../logging/LogAggregator';
import { ComponentLogger } from '../logging/ComponentLogger';

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
    switch(event.type) {
      case 'keyup':
        this.handleKeyup(event);
        break;
    }
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

    // if (this.logger.canLog('keyboard')) {
    //   this.logger.pause(); // temp disable to avoid recursing;
    //   const preventAction = this.preventAction(event);
    //   this.logger.resume(); // undisable

    //   this.logger.log('info', 'keyboard', "[KeyboardHandler::preventAction] Testing whether we're in a textbox or something. Detailed rundown of conditions:\n" +
    //   "\nis tag one of defined inputs? (yes->prevent):", this.inputs.indexOf(activeElement.tagName.toLocaleLowerCase()) !== -1,
    //   "\nis role = textbox? (yes -> prevent):", activeElement.getAttribute("role") === "textbox",
    //   "\nis type === 'text'? (yes -> prevent):", activeElement.getAttribute("type") === "text",
    //   "\nevent.target.isContentEditable? (yes -> prevent):", event.target.isContentEditable,
    //   "\nis keyboard local disabled? (yes -> prevent):", this.keyboardLocalDisabled,
    //   // "\nis keyboard enabled in settings? (no -> prevent)", this.settings.keyboardShortcutsEnabled(window.location.hostname),
    //   "\nwill the action be prevented? (yes -> prevent)", preventAction,
    //   "\n-----------------{ extra debug info }-------------------",
    //   "\ntag name? (lowercase):", activeElement.tagName, activeElement.tagName.toLocaleLowerCase(),
    //   "\nrole:", activeElement.getAttribute('role'),
    //   "\ntype:", activeElement.getAttribute('type'),
    //   "\ninsta-fail inputs:", this.inputs,
    //   "\nevent:", event,
    //   "\nevent.target:", event.target
    //   );
    // }

    if (this.keyboardLocalDisabled) {
      return true;
    }
    // if (!this.settings.keyboardShortcutsEnabled(window.location.hostname)) {
    //   return true;
    // }
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


  handleKeyup(event) {
    this.logger.info('handleKeyup', "we pressed a key: ", event.key , " | keyup: ", event.keyup, "event:", event);

    try {
      if (this.preventAction(event)) {
        this.logger.info('handleKeyup', "we are in a text box or something. Doing nothing.");
        return;
      }

      this.logger.info('handleKeyup', "Trying to find and execute action for event. Actions/event:", this.keypressActions, event);

      const isLatin = this.isLatin(event.key);
      for (const command of this.keypressActions) {
        if (this.isActionMatch(command.shortcut, event, isLatin)) {
          this.eventBus.send(command.action, command.arguments);
        }
      }
    } catch (e) {
      this.logger.debug('handleKeyup', 'Failed to handle keyup!', e);
    }
  }

}

if(process.env.CHANNEL !== 'stable'){
  console.info("KeyboardHandler loaded");
}

export default KeyboardHandler;
