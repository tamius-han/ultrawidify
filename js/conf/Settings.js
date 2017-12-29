// Extension settings are in this file. Site configuration is in Sites.js
// todo: move keybinds here

if(Debug.debug)
  console.log("Loading: Settings.js");

var _se_init = async function(neverFlushStored){
  
  if(Debug.flushStoredSettings && neverFlushStored === false)
    StorageManager.delopt("uw-settings");
  
  if(Debug.debug)
    console.log("[Settings::_se_init()] -------- starting init! ---------");
  
  
  var newSettings = await StorageManager.getopt_async("uw-settings");
  if (Debug.debug)
    console.log("[Settings::_se_init()] settings saved in localstorage are ", (newSettings === {} ? ("nonexistent (", newSettings, ")") : newSettings ));
  
  if (newSettings === {}){
    StorageManager.setopt({"uw-settings": this});
  }
  else{
    for (var k in newSettings) 
      this[k] = newSettings[k];
  }
  
  if(Debug.debug)
    console.log("[Settings::_se_init] settings have been loaded/reloaded. Current state: ", this);
  
}

var _se_save = function(){
  StorageManager.delopt("uw-settings");
  StorageManager.setopt({"uw-settings": this});
}

var _se_reload = function(){
  this.init(true);
}

var Settings = {
  arDetect: {
    enabled: "global",        // thats my csgo rank kappa
    allowedMisaligned: 0.01,  // top and bottom letterbox thickness can differ by this much. Any more and we don't adjust ar.
    allowedArVariance: 0.025, // % by which old ar can differ from the new
    timer_playing: 30,
    timer_paused: 3000,
    blacklist: [],            // banned on enabled: "global" 
    whitelist: []             // enabled on enabled: "whitelist-only", disabled on "disabled"
  },
  arChange: {
    samenessTreshold: 0.025,  // if aspect ratios are within 2.5% within each other, don't resize
  },
  miscFullscreenSettings: {
    videoFloat: "center"
  },
  init: _se_init,
  save: _se_save,
  reload: _se_reload,
}
