// Extension settings are in this file. Site configuration is in Sites.js
// todo: move keybinds here

if(Debug.debug)
  console.log("Loading: Settings.js");

var _se_init = async function(neverFlushStored){
  
//   if(Debug.flushStoredSettings && neverFlushStored === false)
//     StorageManager.delopt("uw-settings");
  
  if(Debug.debug)
    console.log("[Settings::_se_init()] -------- starting init! ---------");
  
  
  var newSettings = await StorageManager.getopt_async("uw-settings");
  var uwVersion = browser.runtime.getManifest().version;
  
  if (Debug.debug)
    console.log("[Settings::_se_init()] settings saved in localstorage are:", newSettings, " - if that's empty, it's gonna be replaced by this:", JSON.stringify(this), ")");
  
  if ((Object.keys(newSettings).length === 0 && newSettings.constructor === Object)){
    console.log("[Settings::_se_init()] replacing settings");
    StorageManager.setopt({"uw-settings": JSON.stringify(this)});
  }
  else{
    var actualSettings = JSON.parse(newSettings["uw-settings"]);
    if(actualSettings.version === undefined || actualSettings.version != uwVersion){
      console.log("[Settings::_se_init()] extension was updated, replacing settings");
      StorageManager.setopt({"uw-settings": JSON.stringify(this)});
    }
    
    if(Debug.debug)
      console.log("[Settings::_se_init()] parsed settings:", actualSettings);
    
    for (var k in actualSettings) 
      this[k] = actualSettings[k];
  }
  
  if(Debug.debug)
    console.log("[Settings::_se_init] settings have been loaded/reloaded. Current state: ", this);
  
}

var _se_save = function(settings){
  StorageManager.delopt("uw-settings");
  
  if(settings !== undefined){
    StorageManager.setopt({"uw-settings": JSON.stringify(settings)});    
  }
  else{
    StorageManager.setopt({"uw-settings": JSON.stringify(this)});
  }
  
  if (Debug.debug)
    console.log("[Settings::_se_save()] saving settings:", JSON.stringify(settings));
}

var _se_reload = function(){
  this.init(true);
}

var _se_isBlacklisted = function(site){
  return this.blacklist.indexOf(site) > -1;
}

var _se_isWhitelisted = function(site){
  return this.whitelist.indexOf(site) > -1;
}

var Settings = {
  arDetect: {
    enabled: "global",        // thats my csgo rank kappa
    allowedMisaligned: 0.05,  // top and bottom letterbox thickness can differ by this much. Any more and we don't adjust ar.
    allowedArVariance: 0.075, // amount by which old ar can differ from the new (1 = 100%)
    timer_playing: 30,
    timer_paused: 3000,
    timer_error: 3000,
    hSamples: 1280,
    vSamples: 720,
    staticSampleCols: 9,      // we take a column at [0-n]/n-th parts along the width and sample it
    randomSampleCols: 0,      // we add this many randomly selected columns to the static columns
    staticSampleRows: 9,      // forms grid with staticSampleCols. Determined in the same way. For black frame checks
    blacklist: [],            // banned on enabled: "global" 
    whitelist: []             // enabled on enabled: "whitelist-only", disabled on "disabled"
  },
  arChange: {
    samenessTreshold: 0.025,  // if aspect ratios are within 2.5% within each other, don't resize
  },
  miscFullscreenSettings: {
    videoFloat: "center"
  },
  colors:{
//     criticalFail: "background: #fa2; color: #000"
  },
  whitelist: [],
  blacklist: ["vimeo.com", "reddit.com", "imgur.com"],
  isBlacklisted: _se_isBlacklisted,
  isWhitelisted: _se_isWhitelisted,
  init: _se_init,
  save: _se_save,
  reload: _se_reload,
}
