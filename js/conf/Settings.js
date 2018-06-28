// This file handles saving and loading of settings. 
// Actual settings are in ExtensionConf

if(Debug.debug)
  console.log("Loading: Settings.js");

var _se_init = async function(isSlave){
  
  if(Debug.debug)
    console.log("[Settings::_se_init()] -------- starting init! ---------");
  
  if(isSlave === undefined)
    isSlave = false;
  
  if(isSlave){
    // request settings from background script. Yes, this is supposed to be global.
    var res = await Comms.sendToBackgroundScript({cmd: "gib-settings"});
    
    ExtensionConf = res.response;
    
    if(Debug.debug){
      console.log("[Settings::_se_init()] received settings from the background script. ExtensionConf:",ExtensionConf,"response message was this:",res);
    }
    
    return;
  }
  
  
  var newSettings = await StorageManager.getopt_async("uw-settings");
  var uwVersion = browser.runtime.getManifest().version;
  
  if (Debug.debug)
    console.log("[Settings::_se_init()] settings saved in localstorage are:", newSettings, " - if that's empty, it's gonna be replaced by this:", ExtensionConf, ")");
  
  if ((Object.keys(newSettings).length === 0 && newSettings.constructor === Object)){
    if(Debug.debug)
      console.log("[Settings::_se_init()] no saved settings, saving default");
    StorageManager.setopt({"uw-settings": ExtensionConf});
  }
  else{
    var actualSettings = newSettings["uw-settings"];
    if(actualSettings.version === undefined || actualSettings.version != uwVersion){
      ExtensionConf['version'] = uwVersion;
      
      if(Debug.debug)
        console.log("[Settings::_se_init()] extension was updated, replacing settings", ExtensionConf);
      
      StorageManager.setopt({"uw-settings": ExtensionConf});
    }
    else{
      _se_patchUserSettings(actualSettings, ExtensionConf);
    }
    if(Debug.debug)
      console.log("[Settings::_se_init()] parsed settings:", actualSettings, "were they copied to ExtensionConf?",ExtensionConf);
    
  }
  
  if(Debug.debug)
    console.log("[Settings::_se_init] settings have been loaded/reloaded. Current state: ", ExtensionConf);
  
}

var _se_patchUserSettings = function(saved, extDefaults){
  for(var k in extDefaults){
    if(extDefaults[k] != null && typeof extDefaults[k] === 'object' && extDefaults[k].constructor === Object){
      if(typeof saved[k] !== 'object' || saved[k].constructor !== Object || extDefaults[k].override === true)
        continue;   // if user's settings are wrong or if override flag is set, we keep value in extDefaults
      
      _se_patchUserSettings(saved[k], extDefaults[k]);
    }
    else{
      extDefaults[k] = saved[k];
    }
  }
}

var _se_save = function(settings){
  StorageManager.delopt("uw-settings");
  
  if(settings !== undefined){
    StorageManager.setopt({"uw-settings": settings});    
  }
  else{
    StorageManager.setopt({"uw-settings": ExtensionConf});
  }
  
  if (Debug.debug)
    console.log("[Settings::_se_save()] saving settings:", settings);
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
  init: _se_init,
  save: _se_save,
  reload: _se_reload,
}


// -----------------------------------------
// Nastavitve za posamezno stran
// Config for a given page:
// 
// <hostname> : {
//    status: <option>              // should extension work on this site?
//    arStatus: <option>            // should we do autodetection on this site?
//    statusEmbedded: <option>      // reserved for future... maybe
// } 
//  
// Veljavne vrednosti za možnosti 
// Valid values for options:
//
//     status, arStatus, statusEmbedded:
//    
//    * enabled     — always allow
//    * default     — allow if default is to allow, block if default is to block
//    * disabled    — never allow
// 

canStartExtension = function(site) {
  if(site === undefined) {
    site = window.location.hostname;
  }
  
  // console.log("CAN WE START THIS EXTENSION ON SITE", site,
  //             "?\n\nExtensionConf.sites[site]=",ExtensionConf.sites[site],
  //             "\nExtension mode?", ExtensionConf.extensionMode
  //           );

  if (ExtensionConf.sites[site] === undefined) {
    return ExtensionConf.extensionMode === "blacklist"; // site not defined, this does default option
  }

  if (ExtensionConf.extensionMode === "blacklist") {
    return ExtensionConf.sites[site].status !== "disabled";
  } else if (ExtensionConf.extensionMode === "whitelist" ) {
    return ExtensionConf.sites[site].status === "enabled";
  } else {
    return false;
  }
}

canStartAutoAr = function(site) {
  if(site === undefined) {
    site = window.location.hostname;
  }

  if (ExtensionConf.sites[site] === undefined) {
    return ExtensionConf.arDetect.mode === "blacklist"; // site not defined, this does default option
  }
  
  if (ExtensionConf.arDetect.mode === "blacklist") {
    return ExtensionConf.sites[site].arStatus !== "disabled";
  } else if (ExtensionConf.arDetect.mode === "whitelist" ) {
    return ExtensionConf.sites[site].arStatus === "enabled";
  } else {
    return false;
  }
}