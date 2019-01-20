import Debug from '../conf/Debug';
import PlayerData from './video-data/PlayerData';

class ActionHandler {

  constructor(pageInfo) {
    this.pageInfo = pageInfo;
    this.settings = pageInfo.settings;
    
    this.inputs = ['input', 'select', 'button', 'textarea'];
  }

  init() {
    if (Debug.debug) {
      console.log("[ActionHandler::init] starting init");
    }

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

    console.log("----ACTIONS----", actions)

    for (var action of actions) {
      console.log("----ACTION:", action);
      if (!action.scopes) {
        continue;
      }
      for (var scope in action.scopes) {
        console.log("----ACTION - scope:", action.scopes[scope]);
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
    if (Debug.debug) {
      console.log("[ActionHandler::init] initialization complete");
    }
  }

  registerHandleMouse(videoData) {
    if (Debug.debug) {
      console.log("[ActionHandler::registerHandleMouse] registering handle mouse for videodata:", videoData)
    }
    var ths = this;
    if (videoData.player && videoData.player.element) {
      videoData.player.element.addEventListener('mousemove', (event) => ths.handleMouseMove(event, videoData));
    }
  }


  preventAction() {
    var activeElement = document.activeElement;

    if(Debug.debug && Debug.keyboard) {
      Debug.debug = false; // temp disable to avoid recursing;
      
      console.log("[ActionHandler::preventAction] Testing whether we're in a textbox or something. Detailed rundown of conditions:\n" +
      "is full screen? (yes->allow):", PlayerData.isFullScreen(),
      "\nis tag one of defined inputs? (yes->prevent):", this.inputs.indexOf(activeElement.tagName.toLocaleLowerCase()) !== -1,
      "\nis role = textbox? (yes -> prevent):", activeElement.getAttribute("role") === "textbox",
      "\nis type === 'text'? (yes -> prevent):", activeElement.getAttribute("type") === "text",
      "\nwill the action be prevented? (yes -> prevent)", this.preventAction(),
      "\n-----------------{ extra debug info }-------------------",
      "\ntag name? (lowercase):", activeElement.tagName, activeElement.tagName.toLocaleLowerCase(),
      "\nrole:", activeElement.getAttribute('role'),
      "\ntype:", activeElement.getAttribute('type'),
      "insta-fail inputs:", this.inputs
      );

      Debug.debug = true; // undisable
    }

    // lately youtube has allowed you to read and write comments while watching video in
    // fullscreen mode. We can no longer do this.
    // if (PlayerData.isFullScreen()) {
    //   return false;
    // }
    if (this.inputs.indexOf(activeElement.tagName.toLocaleLowerCase()) !== -1) {
      return true;
    } 
    if (activeElement.getAttribute("role") === "textbox") {
      return true;
    }
    if (activeElement.getAttribute("type") === "text") {
      return true;
    }
    return false;
  }

  isActionMatch(shortcut, event) {
    return shortcut.key      === event.key     &&
           shortcut.ctrlKey  === event.ctrlKey &&
           shortcut.metaKey  === event.metaKey &&
           shortcut.altKey   === event.altKey  &&
           shortcut.shiftKey === event.shiftKey
  }

  execAction(actions, event, videoData) {
    if(Debug.debug  && Debug.keyboard ){
      console.log("%c[ActionHandler::execAction] Trying to find and execute action for event. Actions/event: ", "color: #ff0", actions, event);
    }

    for (var action of actions) {
      if (this.isActionMatch(action.shortcut, event)) {
        if(Debug.debug  && Debug.keyboard ){
          console.log("%c[ActionHandler::execAction] found an action associated with keypress/event: ", "color: #ff0", action);
        }

        for (var cmd of action.cmd) {
          if (action.scope === 'page') {
            if (cmd.action === "set-ar") {
              this.pageInfo.setAr(cmd.arg);
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
            }
          } else if (action.scope === 'site') {
            if (cmd.action === "set-stretch") {
              this.settings.active.sites[window.location.host].stretch = cmd.arg;
            } else if (cmd.action === "set-alignment") {
              this.settings.active.sites[window.location.host].videoAlignment = cmd.arg;
            } else if (cmd.action === "set-extension-mode") {
              this.settings.active.sites[window.location.host].status = cmd.arg;
            } else if (cmd.action === "set-autoar-mode") {
              this.settings.active.sites[window.location.host].arStatus = cmd.arg;
            }
            this.settings.save();
          } else if (action.scope === 'global') {
            if (cmd.action === "set-stretch") {
              this.settings.active.site['@global'].stretch = cmd.arg;
            } else if (cmd.action === "set-alignment") {
              this.settings.active.site['@global'].videoAlignment = cmd.arg;
            } else if (cmd.action === "set-extension-mode") {
              this.settings.active.sites['@global'] = cmd.arg;
            } else if (cmd.action === "set-autoar-mode") {
              this.settings.active.site['@global'].autoar.arStatus = cmd.arg;
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
    if(Debug.debug  && Debug.keyboard ){
      console.log("%c[ActionHandler::handleKeyup] we pressed a key: ", "color: #ff0", event.key , " | keyup: ", event.keyup, "event:", event);
    }

    if (this.preventAction()) {
      if (Debug.debug && Debug.keyboard) {
        console.log("[ActionHandler::handleKeyup] we are in a text box or something. Doing nothing.");
      }
      return;
    }

    this.execAction(this.keyUpActions, event);
  }

  handleKeydown(event) {
    if(Debug.debug  && Debug.keyboard ){
      console.log("%c[ActionHandler::handleKeydown] we pressed a key: ", "color: #ff0", event.key , " | keydown: ", event.keydown, "event:", event);
    }

    if (this.preventAction()) {
      if (Debug.debug && Debug.keyboard) {
        console.log("[ActionHandler::handleKeydown] we are in a text box or something. Doing nothing.");
      }
      return;
    }

    this.execAction(this.keyDownActions, event);
  }

  handleMouseMove(event, videoData) {
    if (Debug.debug && Debug.mousemove) {
      console.log("[ActionHandler::handleMouseMove] mouse move is being handled.\nevent:", event, "\nvideo data:", videoData);
    }
    videoData.panHandler(event);
    this.execAction(this.mouseMoveActions, event, videoData)
  }

}

export default ActionHandler;
