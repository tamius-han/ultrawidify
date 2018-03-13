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
    
    if(Debug.debug)
      console.log("[Settings::_se_init()] parsed settings:", actualSettings);
    
    for (var k in actualSettings) 
      ExtensionConf[k] = actualSettings[k];
  }
  
  if(Debug.debug)
    console.log("[Settings::_se_init] settings have been loaded/reloaded. Current state: ", ExtensionConf);
  
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
