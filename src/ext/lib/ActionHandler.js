import Debug from '../conf/Debug';
import PlayerData from './video-data/PlayerData';
import ExtensionMode from '../../common/enums/extension-mode.enum';

class ActionHandler {

  constructor(pageInfo) {
    this.logger = pageInfo.logger;
    this.pageInfo = pageInfo;
    this.settings = pageInfo.settings;
    
    this.inputs = ['input', 'select', 'button', 'textarea'];
    this.keyboardLocalDisabled = false;
  }

  init() {
    this.logger.log('info', 'debug', "[ActionHandler::init] starting init");

    this.keyUpActions = [];
    this.keyDownActions = [];
    this.mouseMoveActions = [];
    this.mouseScrollUpActions = [];
    this.mouseScrollDownActions = [];
    this.mouseEnterActions = [];
    this.mouseLeaveActions = [];

    var ths = this;

    var actions;    
    try {
      if (this.settings.active.sites[window.location.host].actions) {
        actions = this.settings.active.sites[window.location.host].actions;
      } else {
        actions = this.settings.active.actions;
      }
    } catch (e) {
      actions = this.settings.active.actions;
    }


    for (var action of actions) {
      if (!action.scopes) {
        continue;
      }
      for (var scope in action.scopes) {
        if (! action.scopes[scope].shortcut) {
          continue;
        }

        var shortcut = action.scopes[scope].shortcut[0];
        if (shortcut.onKeyDown) {
          this.keyDownActions.push({
            shortcut: shortcut,
            cmd: action.cmd,
            scope: scope,
          });
        }
        if (shortcut.onKeyUp) {
          this.keyUpActions.push({
            shortcut: shortcut,
            cmd: action.cmd,
            scope: scope,
          });
        }
        if (shortcut.onScrollUp) {
          this.mouseScrollUpActions.push({
            shortcut: shortcut,
            cmd: action.cmd,
            scope: scope,
          });
        }
        if (shortcut.onScrollDown) {
          this.mouseScrollDownActions.push({
            shortcut: shortcut,
            cmd: action.cmd,
            scope: scope,
          });
        }
        if (shortcut.onMouseEnter) {
          this.mouseEnterActions.push({
            shortcut: shortcut,
            cmd: action.cmd,
            scope: scope,
          });
        }
        if (shortcut.onMouseLeave) {
          this.mouseLeaveActions.push({
            shortcut: shortcut,
            cmd: action.cmd,
            scope: scope,
          });
        }
        if (shortcut.onMouseMove) {
          this.mouseMoveActions.push({
            shortcut: shortcut,
            cmd: action.cmd,
            scope: scope,
          });
        }
      }
    }

    document.addEventListener('keydown',  (event) => ths.handleKeydown(event) );
    document.addEventListener('keyup', (event) => ths.handleKeyup(event) );

    this.pageInfo.setActionHandler(this);

    this.logger.log('info', 'debug', "[ActionHandler::init] initialization complete");
  }

  registerHandleMouse(videoData) {
    this.logger.log('info', ['actionHandler', 'mousemove'], "[ActionHandler::registerHandleMouse] registering handle mouse for videodata:", videoData)

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

    if(this.logger.canLog('keyboard')) {
      this.logger.pause(); // temp disable to avoid recursing;
      const preventAction = this.preventAction();
      this.logger.resume(); // undisable

      this.logger.log('info', 'keyboard', "[ActionHandler::preventAction] Testing whether we're in a textbox or something. Detailed rundown of conditions:\n" +
      "is full screen? (yes->allow):", PlayerData.isFullScreen(),
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

    // lately youtube has allowed you to read and write comments while watching video in
    // fullscreen mode. We can no longer do this.
    // if (PlayerData.isFullScreen()) {
    //   return false;
    // }

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

  isLatin(key) {
    return 'abcdefghijklmnopqrstuvwxyz,.-+1234567890'.indexOf(key.toLocaleLowerCase()) !== -1;
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

  execAction(actions, event, videoData) {
    this.logger.log('info', 'keyboard', "%c[ActionHandler::execAction] Trying to find and execute action for event. Actions/event: ", "color: #ff0", actions, event);

    const isLatin = this.isLatin(event.key);

    for (var action of actions) {
      if (this.isActionMatch(action.shortcut, event, isLatin)) {
        this.logger.log('info', 'keyboard', "%c[ActionHandler::execAction] found an action associated with keypress/event: ", "color: #ff0", action);

        for (var cmd of action.cmd) {
          if (action.scope === 'page') {
            if (cmd.action === "set-ar") {
              this.pageInfo.setAr({type: cmd.arg, ratio: cmd.customArg});
            } else if (cmd.action === "change-zoom") {
              this.pageInfo.zoomStep(cmd.arg);
            } else if (cmd.action === "set-zoom") {
              this.pageInfo.setZoom(cmd.arg);
            } else if (cmd.action === "set-stretch") {
              this.pageInfo.setStretchMode(cmd.arg);
            } else if (cmd.action === "toggle-pan") {
              this.pageInfo.setPanMode(cmd.arg)
            } else if (cmd.action === "pan") {
              if (videoData) {
                videoData.panHandler(event, true);
              }
            } else if (cmd.action === 'set-keyboard') {
              this.setKeyboardLocal(cmd.arg);
            }
          } else {
            let site = action.scope === 'site' ? window.location.host : '@global';

            if (cmd.action === "set-stretch") {
              this.settings.active.sites[site].stretch = cmd.arg;
            } else if (cmd.action === "set-alignment") {
              this.settings.active.sites[site].videoAlignment = cmd.arg;
            } else if (cmd.action === "set-extension-mode") {
              this.settings.active.sites[site].status = cmd.arg;
            } else if (cmd.action === "set-autoar-mode") {
              this.settings.active.sites[site].arStatus = cmd.arg;
            } else if (cmd.action === 'set-keyboard') {
              this.settings.active.sites[site].keyboardShortcutsEnabled = cmd.arg;
            }
            this.settings.save();
          }
        }

        // če smo našli dejanje za to tipko, potem ne preiskujemo naprej
        // if we found an action for this key, we stop searching for a match
        return;
      }
    }
  }


  handleKeyup(event) {
    this.logger.log('info', 'keyboard', "%c[ActionHandler::handleKeyup] we pressed a key: ", "color: #ff0", event.key , " | keyup: ", event.keyup, "event:", event);

    if (this.preventAction(event)) {
      this.logger.log('info', 'keyboard', "[ActionHandler::handleKeyup] we are in a text box or something. Doing nothing.");
      return;
    }

    this.execAction(this.keyUpActions, event);
  }

  handleKeydown(event) {
    this.logger.log('info', 'keyboard', "%c[ActionHandler::handleKeydown] we pressed a key: ", "color: #ff0", event.key , " | keydown: ", event.keydown, "event:", event)

    if (this.preventAction(event)) {
      this.logger.log('info', 'keyboard', "[ActionHandler::handleKeydown] we are in a text box or something. Doing nothing.");
      return;
    }

    this.execAction(this.keyDownActions, event);
  }

  handleMouseMove(event, videoData) {
    this.logger.log('info', 'keyboard', "[ActionHandler::handleMouseMove] mouse move is being handled.\nevent:", event, "\nvideo data:", videoData);
    videoData.panHandler(event);
    this.execAction(this.mouseMoveActions, event, videoData)
  }

}

export default ActionHandler;
