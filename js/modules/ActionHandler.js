if (Debug.debug) {
  console.log("Loading: ActionHandler.js");
}

class ActionHandler {

  constructor(pageInfo) {
    this.pageInfo = pageInfo;
    this.settings = pageInfo.settings;
    
    this.inputs = ['input', 'select', 'button', 'textarea'];
  }

  init() {
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
      if (action.onKeyDown) {
        this.keyDownActions.push(action);
      }
      if (action.onKeyUp) {
        this.keyUpActions.push(action);
      }
      if (action.onScrollUp) {
        this.mouseScrollUpActions.push(action);
      }
      if (action.onScrollDown) {
        this.mouseScrollDownActions.push(action);
      }
      if (action.onMouseEnter) {
        this.mouseEnterActions.push(action);
      }
      if (action.onMouseLeave) {
        this.mouseLeaveActions.push(action);
      }
      if (action.onMouseMove) {
        this.mouseMoveActions.push(action);
      }
    }

    document.addEventListener('keydown',  (event) => ths.handleKeydown(event) );
    document.addEventListener('keyup', (event) => ths.handleKeyup(event) );
  }

  preventAction() {
    var activeElement = document.activeElement;

    if(Debug.debug && Debug.keyboard) {
      Debug.debug = false; // temp disable to avoid recursing;
      
      console.log("[ActionHandler::preventAction] Testing whether we're in a textbox or something. Detailed rundown of conditions:\n" +
      "is full screen? (yes->allow):", PlayerData.isFullScreen(),
      "\nis tag one of defined inputs? (no->prevent):", this.inputs.indexOf(activeElement.tagName.toLocaleLowerCase()) !== -1,
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

    if (PlayerData.isFullScreen()) {
      return false;
    }
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

  execAction(actions, event, shortcutIndex) {
    if(Debug.debug  && Debug.keyboard ){
      console.log("%c[ActionHandler::execAction] Trying to find and execute action for event.: ", "color: #ff0");
    }

    if (!shortcutIndex) {
      shortcutIndex = 0;
    }

    for (var action of actions) {
      if (this.isActionMatch(action.shortcut[shortcutIndex], event)) {
        if(Debug.debug  && Debug.keyboard ){
          console.log("%c[ActionHandler::execAction] found an action associated with keypress/event: ", "color: #ff0", action);
        }

        for (var cmd of action.cmd) {
          if (cmd.action === "crop") {
            this.pageInfo.stopArDetection();
            this.pageInfo.setAr(cmd.arg);
          } else if (cmd.action === "zoom") {
            this.pageInfo.stopArDetection();
            this.pageInfo.zoomStep(cmd.arg);
          } else if (cmd.action === "stretch") {
            this.pageInfo.setStretchMode(cmd.arg);
          } else if (cmd.action === "toggle-pan") {
            this.pageInfo.setPanMode(cmd.arg)
          } else if (cmd.action === "pan") {
            // todo: handle this
          }

        }

        return;
      }
    }
  }

  handleKeyup(event) {
    if(Debug.debug  && Debug.keyboard ){
      console.log("%c[ActionHandler::handleKeyup] we pressed a key: ", "color: #ff0", event.key , " | keydown: ", event.keydown, "event:", event);
    }

    if (this.preventAction()) {
      return;
    }


  }

}