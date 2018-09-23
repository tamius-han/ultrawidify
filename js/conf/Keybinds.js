if(Debug.debug)
  console.log("Loading: Keybinds.js");

class Keybinds {
  constructor(pageInfo){
    this.pageInfo = pageInfo;
    this.settings = pageInfo.settings;
    this.inputs = ['input','select','button','textarea'];
  }

  setup(){
    var ths = this;
    document.addEventListener('keydown',  (event) => ths.handleKeypress(event) );
    document.addEventListener('keyup', (event) => ths.handleKeypress(event,true) );
  }

  handleKeypress(event, isKeyUp) {          // Tukaj ugotovimo, katero tipko smo pritisnili
  
    if(Debug.debug  && Debug.keyboard ){
      console.log("%c[Keybinds::_kbd_process] we pressed a key: ", "color: #ff0", event.key , " | keydown: ", event.keydown, "event:", event);
    }
    
    // Tipke upoštevamo samo, če smo v celozaslonskem načinu oz. če ne pišemo komentarja
    // v nasprotnem primeru ne naredimo nič.
    // We only take actions if we're in full screen or not writing a comment
    var activeElement = document.activeElement;

    if( (! PlayerData.isFullScreen()) && (
      (this.inputs.indexOf(activeElement.tagName.toLocaleLowerCase()) !== -1) ||
      (activeElement.getAttribute("role") === "textbox") ||
      (activeElement.getAttribute("type") === "text")
    )){
      if(Debug.debug && Debug.keyboard)
        console.log("[Keybinds::_kbd_process] We're writing a comment or something. Doing nothing");
      return;
    }
    
    
    // building modifiers list:
    var modlist = "";
    for(var mod of this.settings.active.keyboard.modKeys){
      if(event[mod])
        modlist += (mod + "_")
    }
      
    if(Debug.debug  && Debug.keyboard ){
      if(modlist)
        console.log("[Keybinds::_kbd_process] there's been modifier keys. Modlist:", modlist);
    }
    
    var keypress = modlist + event.key.toLowerCase();
    
    if(Debug.debug  && Debug.keyboard )
      console.log("[Keybinds::_kbd_process] our full keypress is this", keypress );
    
    
    if(this.settings.active.keyboard.shortcuts[keypress]){
      var conf = this.settings.active.keyboard.shortcuts[keypress];

      if (isKeyUp) {
        if (conf.keyup) {
          conf = conf.keyup;
        } else {
          return;
        }
      }
      
      if(Debug.debug && Debug.keyboard) {
        console.log("[Keybinds::_kbd_process] there's an action associated with this keypress. conf:", conf, "conf.arg:", conf.arg);
      }

      if (conf.action === "crop"){
        this.pageInfo.stopArDetection();
        this.pageInfo.setAr(conf.arg);
      } else if (conf.action === "zoom"){
        this.pageInfo.stopArDetection();
        this.pageInfo.zoomStep(conf.arg);
      } else if (conf.action === "auto-ar"){
        this.pageInfo.startArDetection();
      } else if (conf.action === "pan") {
        this.pageInfo.setPanMode(conf.arg);
      }
    }
  }
}