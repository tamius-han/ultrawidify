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


var _sc_init(){
  
}

var _sc_reload() {
  _sc_init();
}

var _sc_save() {
  StorageManager.delopt("uw-siteopts");
  StorageManager.setopt({"uw-siteopts": JSON.stringify(_sc_sites)});    
}


var _sc_createEmptySite() {
  return {
    status: "follow-global",
    arStatus: "follow-global",
    statusEmbedded: "follow-global",
  };
}

var _sc_siteEnabled(site){
  
  // če za stran nismo določili načina delovanja, potem storimo privzeto stvar
  // if we haven't defined options for a site, we do the default thing
  if( _sc_sites[site] == undefined || _sc_sites[site].status == "follow-global"){
    if ( Settings.extensionMode == "blacklist" ){
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

var _sc_arEnabled(site){
  if( _sc_sites[site] == undefined || _sc_sites[site].arStatus == "follow-global" ){
    if(Settings.arDetect.mode == "blacklist" ){
      return true;
    }
    return false;
  }
  
  if( _sc_sites[site].arStatus == "whitelisted" )
    return true;
  
  if( _sc_sites[site].arStatus == "blacklisted" )
    return false;
}

var _sc_updateSiteStatus(site, status){
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

// Nastavitve za posamezno stran
// Config for a given page:
// 
// <hostname> : {
//    status: <option>              // should extension work on this site?
//    arStatus: <option>            // should we do autodetection on this site?
//    statusEmbedded: <option>      // should we do autodetection on this site?
// } 
//  
// Veljavne vrednosti za možnosti 
// Valid values for options:
//
//     status, arStatus, statusEmbedded:
//    
//    * whitelisted     — always allow
//    * follow-global   — allow if default is to allow, block if default is to block
//    * blacklisted     — never allow
// 

var _sc_sites = {
  "youtube.com" : {
    status: "whitelisted",           // should extension work on this site?
    arStatus: "follow-global",       // should we enable autodetection
    statusEmbedded: "whitelisted",   // should extension work for this site when embedded on other sites?
    override: false                  // ignore value localStorage in favour of this
  },
  "netflix.com" : {
    status: "whitelisted",
    arStatus: "blacklisted",
    statusEmbedded: "whitelisted",
    override: false
  },
}






var SitesConf = {
  siteopts: _sc_sites,
  init: _sc_init,
  sites: null
}
