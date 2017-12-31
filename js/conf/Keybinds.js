if(Debug.debug)
  console.log("Loading: Keybinds.js");

var _kbd_ModKeys = ["ctrlKey", "shiftKey", "altKey"];
var _kbd_keybinds = {};

var DEFAULT_KEYBINDINGS = {
  "w": {
    action: "fitw"
  },
  "e": {
    action: "fith"
  },
  "r": {
    action: "reset"
  },
  "a": {
    action: "autoar"
  },
  "s": {
    action: "char",
    targetAr: 1.78 
  },
  "d": {
    action: "char",
    targetAr: 2.39
  },
  "x": {
    action: "char",
    targetAr: 2.0
  }
}


var _kbd_process = function (event) {          // Tukaj ugotovimo, katero tipko smo pritisnili
  
  // Tipke upoštevamo samo, če smo v celozaslonskem načinu oz. če ne pišemo komentarja
  // v nasprotnem primeru ne naredimo nič.
  // We only take actions if we're in full screen or not writing a comment
  if( !(FullScreenDetect.isFullScreen() || (
    (document.activeElement.getAttribute("role") != "textbox") &&
    (document.activeElement.getAttribute("type") != "text")
  ))){
    if(Debug.debug && Debug.keyboard)
      console.log("[Keybinds::_kbd_process] We're writing a comment or something. Doing nothing");
    return;
  }
  
  if(Debug.debug  && Debug.keyboard ){
    console.log("[Keybinds::_kbd_process] we pressed a key: ", event.key , " | keydown: ", event.keydown, "event:", event);
  }
  
  // building modifiers list:
  var modlist = "";
  for(var mod of _kbd_ModKeys){
    if(event[mod])
      modlist += (mod + "_")
  }
    
  if(Debug.debug  && Debug.keyboard ){
    if(modlist)
      console.log("[Keybinds::_kbd_process] there's been modifier keys. Modlist:", modlist);
  }
  
  var keypress = modlist + event.key.toLowerCase();
  
  if(Debug.debug  && Debug.keyboard )
    console.log("[Keybinds::_kbd_process] our full keypress is this", keypress, "_kbd_keybinds:", {kb: _kbd_keybinds} );
  
  
  if(_kbd_keybinds[keypress]){
    var conf = _kbd_keybinds[keypress];
    
    if(Debug.debug && Debug.keyboard)
      console.log("[Keybinds::_kbd_process] there's an action associated with this keypress. conf:", conf);
    
    if(conf.action != "autoar")
      ArDetect.stop();
    
    if(conf.action == "char"){
//       Status.arStat = "fixed";
      Resizer.setAr(conf.targetAr);
    }
    else{
      Resizer.legacyAr(conf.action);
    }
  }
}

var _kbd_load = async function() {
  if(Debug.debug)
    console.log("[Keybinds::_kbd_setup_init] Setting up keybinds");
  
  var ret = await StorageManager.getopt_async("keybinds");
  
  var keybinds = ret.keybinds;
  
  if(Array.isArray(keybinds)){
    StorageManager.delopt("keybinds");
    keybinds = DEFAULT_KEYBINDINGS;
  }
  
  if(Debug.debug)
    console.log("[Keybinds::_kbd_setup_init] loaded keybinds from storage. Do they exist?", keybinds, $.isEmptyObject(keybinds));
  
  if( $.isEmptyObject(keybinds) ){
    keybinds = DEFAULT_KEYBINDINGS;
    StorageManager.setopt({"keybinds":keybinds});
    
    if(Debug.debug)
      console.log("[Keybinds::_kbd_setup_init] setting keybinds to default", keybinds);
    
  }
  
  _kbd_keybinds = keybinds; 
}

var _kbd_setup = async function() {
  await _kbd_load();
  
  $(document).keydown(_kbd_process);
}

var _kbd_fetch = async function(){
  if($.isEmptyObject(_kbd_keybinds)){
    await _kbd_load();
  }
  
  return _kbd_keybinds;
}

var Keybinds = {
  init: _kbd_setup,
  fetch: _kbd_fetch,
  mods: _kbd_ModKeys
}
