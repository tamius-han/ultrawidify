if(Debug.debug){
  console.log("Loading: SitesConf.js");
}



var _sc_sites = {
  "www.youtube.com" : {
    status: "whitelisted",           // should extension work on this site?
    arStatus: "follow-global",       // should we enable autodetection
    statusEmbedded: "whitelisted",   // should extension work for this site when embedded on other sites?
    override: false                  // ignore value localStorage in favour of this
  },
  "www.netflix.com" : {
    status: "whitelisted",
    arStatus: "blacklisted",
    statusEmbedded: "whitelisted",
    override: false
  },
}

// var _sc_SITES = {
//   "vimeo.com" : {
//     extraCss: [],
//     bannedCss: [],
//     nonfsPlayerMod: function(){
//       // hack player to take all the width
//       $("head").append('<style type="text/css">.uw_forceFullWidth {width: 100% !important} .uw_forceCenter{text-align: center;}</style>');
//       
//       var e = document.getElementsByClassName("player_outro_area")[0];
//       e.classList.add("uw_forceFullWidth");
//       e.classList.add("uw_forceCenter");
//       e = document.getElementsByClassName("player_container")[0];
//       e.classList.add("uw_forceFullWidth");
//       e.classList.add("uw_forceCenter");
//       
//       $("video")[0].style.display = "inline-block";
//     },
//     fsPlayerMod: function(){
//       // hack player to take all the width
//       $("head").append('<style type="text/css">.uw_forceFullWidth {width: 100% !important} .uw_forceCenter{text-align: center;}</style>');
//       
//       var e = document.getElementsByClassName("player_outro_area")[0];
//       e.classList.add("uw_forceFullWidth");
//       e.classList.add("uw_forceCenter");
//       e = document.getElementsByClassName("player_container")[0];
//       e.classList.add("uw_forceFullWidth");
//       e.classList.add("uw_forceCenter");
//       
//       $("video")[0].style.display = "inline-block";
//     }
//   }
// }

var _sc_init = async function(){
  
  var newSettings = await StorageManager.getopt_async("uw-siteopts");
  
  if (Debug.debug)
    console.log("[SitesConf::_sc_init()] settings saved in localstorage are:", newSettings, " - if that's empty, it's gonna be replaced by this:", JSON.stringify(_sc_sites), ")");
  
  if ((Object.keys(newSettings).length === 0 && newSettings.constructor === Object)){
    console.log("[SitesConf::_sc_init()] replacing settings");
    StorageManager.setopt({"uw-siteopts": JSON.stringify(_sc_sites)});
  }
  else{
    var actualSettings = JSON.parse(newSettings["uw-siteopts"]);
    
    if(Debug.debug)
      console.log("[SitesConf::_sc_init()] parsed settings:", actualSettings);
    
    var overrides = 0;
    
    for (var k in actualSettings){
      
      // let sites with override=true override saved sites
      if( _sc_sites[k] != undefined && _sc_sites[k].override ){
        ++overrides;
        continue;
      }
      
      _sc_sites[k] = actualSettings[k];
    }
    
    if(overrides > 0)
      _sc_save();
  }
  
  if(Debug.debug)
    console.log("[SitesConf::_sc_init()] settings have been loaded/reloaded. Current state: ", this);
  
}

var _sc_reset = function(){
  StoreManager.delopt("uw-siteopts");
  _sc_init();
}

var _sc_reload = function(){
  _sc_init();
}

var _sc_save = function(){
  StorageManager.delopt("uw-siteopts");
  StorageManager.setopt({"uw-siteopts": JSON.stringify(_sc_sites)});    
}


var _sc_createEmptySite = function(){
  return {
    status: "follow-global",
    arStatus: "follow-global",
    statusEmbedded: "follow-global",
  };
}

function inIframe(){
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

var _sc_isEnabled = function(site){
//   console.log(".... — _sc_sites[", site, "].status:", (_sc_sites[site] == undefined ? "<default>" : _sc_sites[site].status), "; ExtensionConf.extensionMode:", ExtensionConf.extensionMode)
  if( inIframe ) {
    return _sc_siteEnableEmbedded(site);
  }
  return _sc_siteEnabled(site);
}

var _sc_siteEnabled = function(site){
  
  // če za stran nismo določili načina delovanja, potem storimo privzeto stvar
  // if we haven't defined options for a site, we do the default thing
  if( _sc_sites[site] == undefined || _sc_sites[site].status == "follow-global"){
    
    console.log(".... this site is undefined!");
    
    if ( ExtensionConf.extensionMode == "blacklist" ){
      return true;
    }
    return false;
  }
  
  if( _sc_sites[site].status == "whitelisted" )
    return true;
  
  if( _sc_sites[site].status == "blacklisted" )
    return false;

  // sem ne bi smeli priti, vendar pa za varnost naredimo en return
  // we shouldn't come here but let's do a safety return
  return false;
}

var _sc_siteStatus = function(site){
  if( _sc_sites[site] == undefined)
    return "follow-global";
  return _sc_sites[site].status;
}

var _sc_arEnabled = function(site){
  
  if( _sc_sites[site] == undefined || _sc_sites[site].arStatus == "follow-global" ){
    if(ExtensionConf.extensionMode == "blacklist" ){
      return true;
    }
    return false;
  }
  
  if( _sc_sites[site].arStatus == "whitelisted" )
    return true;
  
  if( _sc_sites[site].arStatus == "blacklisted" )
    return false;
}

var _sc_arStatus = function(site){
  if( _sc_sites[site] == undefined )
    return "follow-global";
  return _sc_sites[site].arStatus;
}

var _sc_siteEnableEmbedded = function(site) {
  
  if( _sc_sites[site] == undefined || _sc_sites[site].statusEmbedded == "follow-global" ){
    if(Debug.debug)
      console.log("[SitesConf::_sc_siteEnableEmbedded] site", site, "is not defined in settings.");
    
    if(ExtensionConf.extensionMode == "blacklist" ){
      return true;
    }
    return false;
  }
  
  if( _sc_sites[site].statusEmbedded == "whitelisted" )
    return true;
  
  if( _sc_sites[site].statusEmbedded == "blacklisted" )
    return false;
}

var _sc_updateSiteStatus = function(site, status){
  // status: {}
  // status.status - optional
  // status.arStatus - optional
  // status.statusEmbedded - optional
  // 
  // <==[ Valid values for options: ]==>
  //
  //    status, arStatus, statusEmbedded:
  //    
  //    * whitelisted     — always allow
  //    * follow-global   — allow if default is to allow, block if default is to block
  //    * blacklisted     — never allow
  
  if( _sc_sites[site] == undefined ){
    _sc_sites[site] = _sc_createEmptySite();
  }
  
  if(status.status != undefined ){
    _sc_sites[site].status = status.status;
  }
  if(status.arStatus != undefined ){
    _sc_sites[site].arStatus = status.arStatus;
  }
  if(status.statusEmbedded != undefined ){
    _sc_sites[site].statusEmbedded = status.statusEmbedded;
  }
  
  _sc_save();
}







var SitesConf = {
  siteopts: _sc_sites,
  init: _sc_init,
  reset: _sc_reset,
  reload: _sc_reload,
  save: _sc_save,
  updateSiteStatus: _sc_updateSiteStatus,
  updateSite: _sc_updateSiteStatus,
  getSiteStatus: _sc_siteStatus,
  getArStatus: _sc_arStatus,
  siteEnabled: _sc_siteEnabled,
  isEnabled: _sc_isEnabled,
  siteEnableEmbedded: _sc_siteEnableEmbedded,
  arEnabled: _sc_arEnabled,
  isArEnabled: _sc_arEnabled
}
