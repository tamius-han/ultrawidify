import Debug from '../conf/Debug';
import PlayerData from './video-data/PlayerData';
import ExtensionMode from '../../common/enums/ExtensionMode.enum';
import Logger from './Logger';
import PageInfo from './video-data/PageInfo';
import Settings from './Settings';
import VideoData from './video-data/VideoData';
import EventBus from './EventBus';

if(process.env.CHANNEL !== 'stable'){
  console.info("Loading ActionHandler");
}

class ActionHandler {
  logger: Logger;
  settings: Settings;
  eventBus: EventBus;


  inputs: string[] = ['input', 'select', 'button', 'textarea'];
  keyboardLocalDisabled: boolean = false;

  mouseMoveActions: any[] = [];

  commands: any[] = [];


  constructor(eventBus, settings, logger) {
    this.logger = logger;
    this.settings = settings;
    this.eventBus = eventBus;

    this.init();
  }

  init() {
    this.logger.log('info', 'debug', "[ActionHandler::init] starting init");

    // build the action list — but only from actions that have shortcuts assigned
    for (const key in this.settings.active.commands) {
      for (const command of this.settings.active.commands[key]) {
        if (command.shortcut) {
          this.commands.push(command);
        }
      }
    }


    // events should be handled in handleEvent function. We need to do things this
    // way, otherwise we can't remove event listener
    // https://stackoverflow.com/a/19507086

    document.addEventListener('keyup', this );
  }

  handleEvent(event) {
    switch(event.type) {
      case 'keyup':
        this.handleKeyup(event);
        break;
      case 'mousemove':
        this.handleMouseMove(event);
        break;
    }
  }

  destroy() {
    document.removeEventListener('keyup', this);
  }

  registerHandleMouse(videoData) {
    this.logger.log('info', ['actionHandler', 'mousemove'], "[ActionHandler::registerHandleMouse] registering handle mouse for videodata:", videoData.id)

    var ths = this;
    if (videoData.player && videoData.player.element) {
      videoData.player.element.addEventListener('mousemove', (event) => ths.handleMouseMove(event, videoData));
    }
  }

  unregisterHandleMouse(videoData) {
    var ths = this;
    if (videoData.player && videoData.player.element) {
      videoData.player.element.removeEventListener('mousemove', (event) => ths.handleMouseMove(event, videoData));
    }
  }

  setKeyboardLocal(state) {
    if (state === ExtensionMode.Enabled) {
      this.keyboardLocalDisabled = false;
    } else if (state === ExtensionMode.Disabled) {
      this.keyboardLocalDisabled = true;
    }
    // don't do shit on invalid value of state
  }

  preventAction(event) {
    var activeElement = document.activeElement;

    if (this.logger.canLog('keyboard')) {
      this.logger.pause(); // temp disable to avoid recursing;
      const preventAction = this.preventAction(event);
      this.logger.resume(); // undisable

      this.logger.log('info', 'keyboard', "[ActionHandler::preventAction] Testing whether we're in a textbox or something. Detailed rundown of conditions:\n" +
      "\nis tag one of defined inputs? (yes->prevent):", this.inputs.indexOf(activeElement.tagName.toLocaleLowerCase()) !== -1,
      "\nis role = textbox? (yes -> prevent):", activeElement.getAttribute("role") === "textbox",
      "\nis type === 'text'? (yes -> prevent):", activeElement.getAttribute("type") === "text",
      "\nevent.target.isContentEditable? (yes -> prevent):", event.target.isContentEditable,
      "\nis keyboard local disabled? (yes -> prevent):", this.keyboardLocalDisabled,
      "\nis keyboard enabled in settings? (no -> prevent)", this.settings.keyboardShortcutsEnabled(window.location.hostname),
      "\nwill the action be prevented? (yes -> prevent)", preventAction,
      "\n-----------------{ extra debug info }-------------------",
      "\ntag name? (lowercase):", activeElement.tagName, activeElement.tagName.toLocaleLowerCase(),
      "\nrole:", activeElement.getAttribute('role'),
      "\ntype:", activeElement.getAttribute('type'),
      "\ninsta-fail inputs:", this.inputs,
      "\nevent:", event,
      "\nevent.target:", event.target
      );
    }

    if (this.keyboardLocalDisabled) {
      return true;
    }
    if (!this.settings.keyboardShortcutsEnabled(window.location.hostname)) {
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
           shortcut.ctrlKey  === event.ctrlKey &&
           shortcut.metaKey  === event.metaKey &&
           shortcut.altKey   === event.altKey  &&
           shortcut.shiftKey === event.shiftKey
  }
  isActionMatchKeyCode(shortcut, event) {
    return shortcut.code     === event.code    &&
           shortcut.ctrlKey  === event.ctrlKey &&
           shortcut.metaKey  === event.metaKey &&
           shortcut.altKey   === event.altKey  &&
           shortcut.shiftKey === event.shiftKey
  }

  isActionMatch(shortcut, event, isLatin = true) {
    // ASCII and symbols fall back to key code matching, because we don't know for sure that
    // regular matching by key is going to work
    return isLatin ?
      this.isActionMatchStandard(shortcut, event) :
      this.isActionMatchStandard(shortcut, event) || this.isActionMatchKeyCode(shortcut, event);
  }


  handleKeyup(event) {
    this.logger.log('info', 'keyboard', "%c[ActionHandler::handleKeyup] we pressed a key: ", "color: #ff0", event.key , " | keyup: ", event.keyup, "event:", event);

    try {
      if (this.preventAction(event)) {
        this.logger.log('info', 'keyboard', "[ActionHandler::handleKeyup] we are in a text box or something. Doing nothing.");
        return;
      }

      this.logger.log('info', 'keyboard', "%c[ActionHandler::handleKeyup] Trying to find and execute action for event. Actions/event: ", "color: #ff0", this.commands, event);

      const isLatin = this.isLatin(event.key);

      for (const command of this.commands) {
        if (this.isActionMatch(command.shortcut, event, isLatin)) {
          this.eventBus.sendGlobal(command.action, command.arguments);
        }
      }
    } catch (e) {
      this.logger.log('info', 'debug', '[ActionHandler::handleKeyup] Failed to handle keyup!', e);
    }
  }


  handleMouseMove(event, videoData?: VideoData) {
    this.logger.log('info', 'keyboard', "[ActionHandler::handleMouseMove] mouse move is being handled.\nevent:", event, "\nvideo data:", videoData);
    console.info('mousemove must be migrated!');
    // videoData?.panHandler(event);
    // this.execAction(this.mouseMoveActions, event, videoData)
  }

}

if(process.env.CHANNEL !== 'stable'){
  console.info("ActionHandler loaded");
}

export default ActionHandler;
