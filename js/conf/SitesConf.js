// functions here. load from storage happens later down the line
var _sc_nonfsAutoar = function() {
  var hostname = window.location.hostname;
  
  if( _sc_SITES[hostname] === undefined)
    return _sc_SITES["DEFAULT"].autoAr.nonfs;
  
  return _sc_SITES[hostname].autoAr.nonfs;
}

var _sc_getPlayerTag = function(){
  var hostname = window.location.hostname;
  
  if( _sc_SITES[hostname] === undefined)
    return undefined;
  
  if( _sc_SITES[hostname].autoAr.playerIdentificationType === undefined)
    return undefined;
  
  
  if( _sc_SITES[hostname].autoAr.playerIdentificationType == "id")
    return document.getElementById(_sc_SITES[hostname].autoAr.playerIdentificationString);
  
  if( _sc_SITES[hostname].autoAr.playerIdentificationType == "className")
    return document.getElementsByClassName(_sc_SITES[hostname].autoAr.playerIdentificationString)[0];
  
  return undefined;
}

// popravi vse, kar je narobe z ne-celozaslonskim predvajalnikom (če je funkcija definirana)
// fix everything that's wrong with the non-fs player, if the function is defined
var _sc_prepareNonfsPlayer = function(){
  var hostname = window.location.hostname;
  
  if( SITES[hostname] === undefined)
    return;
  
  if( SITES[hostname].autoAr.nonfsPlayerMod === undefined )
    return;
  
  SITES[hostname].autoAr.nonfsPlayerMod();
}

var _sc_getMode = function(site){
  if(! this || !this.sites || ! this.sites[site] )
    return "global";
  
  return this.sites[site].enabled;
}



var _sc_callback = function(conf) {
  if (conf === null || conf === {} || conf === [] || conf == ""){
    StorageManager.setopt( {"sitesconf": _sc_SITES} );
    this.sites = _sc_SITES;
  }
  
  this.sites = conf;
}

var _sc_init = function() {
  return StorageManager.getopt("sitesconf", _sc_callback);
}


// Privzete nastavitve. Kasneje jih zamenjamo s tistimi v localStorage (če obstajajo)
// this is the default config. We replace it with the ones in localStorage (if they exist)

/* Konfiguracija za posamezno stran: 
 * Config for a given page
 * 
 * <location.hostname>: {
 *    enabled: string,        // whitelist, blacklist, global
 *    type: string,
 *    autoAr: {             // konfiguracija za samodejno zaznavanje razmerja stranic | conf for aspect ratio autodetection
 *      active: bool           // aktivno zaznavanje — zaznavamo letterbox na sliki | active detection: scan the image
 *      passive: bool          // pasivno zaznavanje — za ar vprašamo imdb in ostale | passive detection: query imdb for aspect ratio
 *      nonfs: bool            // zaznavanje razmerja stranic izven celozaslonskega načina | detect ar if not in fullscreen?
 *      playerIdentificationString: string   
 *      playerIdentificationType: string     // "className" | "id"
 *      nonfsExtra: function   // non-fs hacks are generally site-specific, which means we need to write site-specific code 
 *    }
 * }
 * 
 */


var _sc_SITES = {
  "DEFAULT": {
    enabled: "global",
    type: "nonofficial",
    autoAr: {
      active: true,
      passive: false,
      nonfs: false
    }
  },
  "www.youtube.com" : {
    enabled: "global",
    type: "official",
    autoAr: {
      active: true,
      passive: false,
      nonfs: false,
    }
  },
  "vimeo.com" : {
    enabled: "global",
    type: "official",
    autoAr: {
      active: true,
      passive: false,
      nonfs: true,
      playerIdentificationString: "player_area-wrapper js-player_area-wrapper",
      playerIdentificationType: "className",
      nonfsPlayerMod: function(){
        // hack player to take all the width
        $("head").append('<style type="text/css">.uw_forceFullWidth {width: 100% !important} .uw_forceCenter{text-align: center;}</style>');
        
        var e = document.getElementsByClassName("player_outro_area")[0];
        e.classList.add("uw_forceFullWidth");
        e.classList.add("uw_forceCenter");
        e = document.getElementsByClassName("player_container")[0];
        e.classList.add("uw_forceFullWidth");
        e.classList.add("uw_forceCenter");
        
        $("video")[0].style.display = "inline-block";
      }
    }
  }
}

var SitesConf = {
  nonfsArDetectEnabled: _sc_nonfsAutoar,
  getPlayerTag: _sc_getPlayerTag,
  prepareNonfsPlayer: _sc_prepareNonfsPlayer,
  getMode: _sc_getMode,
  init: _sc_init,
  sites: null
}
