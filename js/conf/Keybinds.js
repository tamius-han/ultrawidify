if(Debug.debug)
  console.log("Loading: Keybinds.js");

class Keybinds {
  constructor(pageInfo){
    this.pageInfo = pageInfo;
  }

  setup(){
    var ths = this;
    document.addEventListener('keydown',  (event) => ths.handleKeypress(event) );
  }

  handleKeypress(event) {          // Tukaj ugotovimo, katero tipko smo pritisnili
  
    if(Debug.debug  && Debug.keyboard ){
      console.log("%c[Keybinds::_kbd_process] we pressed a key: ", "color: #ff0", event.key , " | keydown: ", event.keydown, "event:", event);
    }
    
    // Tipke upoštevamo samo, če smo v celozaslonskem načinu oz. če ne pišemo komentarja
    // v nasprotnem primeru ne naredimo nič.
    // We only take actions if we're in full screen or not writing a comment
    if( !(PlayerData.isFullScreen() || (
      (document.activeElement.getAttribute("role") != "textbox") &&
      (document.activeElement.getAttribute("type") != "text")
    ))){
      if(Debug.debug && Debug.keyboard)
        console.log("[Keybinds::_kbd_process] We're writing a comment or something. Doing nothing");
      return;
    }
    
    
    // building modifiers list:
    var modlist = "";
    for(var mod of ExtensionConf.keybinds.modKeys){
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
    
    
    if(ExtensionConf.keybinds.shortcuts[keypress]){
      var conf = ExtensionConf.keybinds.shortcuts[keypress];
      
      if(Debug.debug && Debug.keyboard)
        console.log("[Keybinds::_kbd_process] there's an action associated with this keypress. conf:", conf);
      
      if(conf.action === "crop"){
        this.pageInfo.stopArDetection();
        this.pageInfo.setAr(conf.arg);
      }
      if(conf.action === "zoom"){
        this.pageInfo.stopArDetection();
        this.pageInfo.zoomStep(conf.arg);
      }
      if(conf.action === "auto-ar"){
        this.pageInfo.startArDetection();
      }
    }
  }
}