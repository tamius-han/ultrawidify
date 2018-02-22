// Extension settings are in this file. Site configuration is in Sites.js
// todo: move keybinds here

if(Debug.debug)
  console.log("Loading: Settings.js");

var _se_init = async function(neverFlushStored){
  
//   if(Debug.flushStoredSettings && neverFlushStored === false)
    StorageManager.delopt("uw-settings");
  
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
    allowedMisaligned: 0.05,  // top and bottom letterbox thickness can differ by this much. 
                              // Any more and we don't adjust ar.
    allowedArVariance: 0.075, // amount by which old ar can differ from the new (1 = 100%)
    timer_playing: 30,        // we trigger ar this often (in ms) under this conditions
    timer_paused: 3000,
    timer_error: 3000,
    timer_minimumTimeout: 5,  // but regardless of above, we wait this many msec before retriggering
    hSamples: 1280,
    vSamples: 720,
    blackLevel_default: 10,   // everything darker than 10/255 across all RGB components is considered black by
                              // default. GlobalVars.blackLevel can decrease if we detect darker black.
    blackbarTreshold: 2,      // if pixel is darker than blackLevel + blackbarTreshold, we count it as black
    staticSampleCols: 9,      // we take a column at [0-n]/n-th parts along the width and sample it
    randomSampleCols: 0,      // we add this many randomly selected columns to the static columns
    staticSampleRows: 9,      // forms grid with staticSampleCols. Determined in the same way. For black frame checks
    blacklist: [],            // banned on enabled: "global" 
    whitelist: [],            // enabled on enabled: "whitelist-only", disabled on "disabled"
    guardLine: {              // all pixels on the guardline need to be black, or else we trigger AR recalculation 
                              // (if AR fails to be recalculated, we reset AR)
      enabled: true,
      ignoreEdgeMargin: 0.20, // we ignore anything that pokes over the black line this close to the edge
                              // (relative to width of the sample)
      imageTestTreshold: 0.1, // when testing for image, this much pixels must be over blackbarTreshold
      edgeTolerancePx: 3,         // black edge violation is performed this far from reported 'last black pixel'
      edgeTolerancePercent: null  // unused. same as above, except use % of canvas height instead of pixels
    },
    arSwitchLimiter: {        // to be implemented 
      switches: 2,            // we can switch this many times
      period: 2.0             // per this period
    },
    edgeDetection: {
      sampleWidth: 20,        // we take a sample this wide for edge detection
      detectionTreshold: 10,  // sample needs to have this many non-black pixels to be a valid edge
      singleSideConfirmationTreshold: 0.3,   // we need this much edges (out of all samples, not just edges) in order
                                            // to confirm an edge in case there's no edges on top or bottom (other
                                           // than logo, of course)
      logoTreshold: 0.15,     // if edge candidate sits with count greater than this*all_samples, it can't be logo
                              // or watermarl.
      edgeTolerancePx: 2,         // we check for black edge violation this far from detection point
      edgeTolerancePercent: null  // we check for black edge detection this % of height from detection point. unused
    }
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
  blacklist: ["vimeo.com", "reddit.com"],
  isBlacklisted: _se_isBlacklisted,
  isWhitelisted: _se_isWhitelisted,
  init: _se_init,
  save: _se_save,
  reload: _se_reload,
}
