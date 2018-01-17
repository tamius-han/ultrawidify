if(Debug.debug)
  console.log("\n\n\n\n\n\n           ———    Sᴛλʀᴛɪɴɢ  Uʟᴛʀᴀᴡɪᴅɪꜰʏ    ———\n               <<   ʟᴏᴀᴅɪɴɢ ᴍᴀɪɴ ꜰɪʟᴇ   >>\n\n\n\n");

// global-ish
var _main_last_fullscreen;

// load all settings from localStorage:

async function main(){
  if(Debug.debug)
    console.log("[uw::main] loading configuration ...");

  // load settings
  await Settings.init();
  var scpromise = SitesConf.init();
  var kbpromise = Keybinds.init();
  
  ExtensionConf.init();

  // počakamo, da so nastavitve naložene
  // wait for settings to load
  await scpromise;
  await kbpromise;


  if(Debug.debug)
    console.log("configuration should be loaded now");
  // start autoar and setup everything


// $(document).ready(function() {
  if(Debug.debug)
    console.log("uw::document.ready | document is ready. Starting ar script ...");

  if(SitesConf.getMode(window.location.hostname) == "blacklist" ){
    if(Debug.debug)
      console.log("uw::document.ready | site", window.location.hostname, "is blacklisted.");

    return;
  }
  
  if( ExtensionConf.mode == "none" ){
    if(Debug.debug)
      console.log("uw::document.ready | Extension is soft-disabled via popup");
    
    return;
  }
  if( ExtensionConf.mode == "whitelist" && SitesConf.getMode(window.location.hostname) != "whitelist"){
    if(Debug.debug)
      console.log("uw::document.ready | extension is set to run on whitelisted sites only, but site ", window.location.hostname, "is not on whitelist.");
    
    return;
  }
  
  
  
  if(Settings.arDetect.enabled == "global"){
    if(Debug.debug)
      console.log("[uw::main] Aspect ratio detection is enabled. Starting ArDetect");
    ArDetect.arSetup();
  }
  else{
    if(Debug.debug)
      console.log("[uw::main] Aspect ratio detection is disabled. This is in settings:", Settings.arDetect.enabled);
  }
  
  // preden karkoli delamo, se pozanimamo, ali smo v celozaslonskem načinu.
  // ne bi smeli biti, načeloma
  // je možnost, da smo i guess?
  // 
  // before we add this event, determine initial fullscreen state.
  // we shouldn't be
  // there's a chance that we are tho, I guess
  
  _main_last_fullscreen = FullScreenDetect.isFullScreen();
  
  // Poslušamo za lovljenje spremembe iz navadnega načina v celozaslonski način in obratno.
  // Listen for and handle changes to and from full screen.
  $(document).bind('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange',  function(){
    if(Debug.debug){
      console.log("%c[uw::onfullscreenchange] are we in full screen?","color: #aaf", FullScreenDetect.isFullScreen());
    }
//     fullScreenCheck(0);
  });

  browser.runtime.onMessage.addListener(receiveMessage);

}

var _main_fscheck_tries = 3;

function fullScreenCheck(count) {
  if(count >= _main_fscheck_tries){
    if(Debug.debug){
      console.log("[uw::fullScreenCheck] ok really, I guess.");
    }
    return;
  }
  
  var fsnow = FullScreenDetect.isFullScreen();
  
  // we restore, always — esp. now that we also do things in non-fullscreen
  
//   if(fsnow){
    // full screen is on
//     Resizer.restore();
//   }
//   else{
//     Resizer.reset();
//   }
  
  // kaj pa, če je FullScreenDetect vrnil narobno vrednost?
  // what if FullScreenDetect was not right? Let's verify; if it was wrong we re-trigger it in about 100 ms.
  
  if(fsnow != _main_last_fullscreen){

    // posodobimo vrednost / update value
    _main_last_fullscreen = fsnow;

    // če je to res, count pa je večji kot 0, potem smo imeli prav.
    // if that's the case and count is greater than 0, then we were right at some point.    
    if(Debug.debug && count > 0){
      console.log("[uw::fullScreenCheck] fucking knew it")
    }
    return;
  }
  else{
    // dobili smo event za spremembo celozaslonskega stanja. Stanje se ni spremenilo. Hmmm.
    // we got an event for fullscreen state change. State is unchanged. Hmmm.
    if(Debug.debug){
      console.log("[uw::fullScreenCheck] oh _really_? 🤔🤔🤔 -- fullscreen state", FullScreenDetect.isFullScreen());
    }
    count++;
    setTimeout(fullScreenCheck, 200, count);
  }
  console.log("-------------------------------");
}

// comms
function receiveMessage(message, sender, sendResponse) {
  if(Debug.debug)
    console.log("[uw::receiveMessage] we received a message.", message);
  
  if(message.cmd == "has-videos"){
    var anyVideos = PageInfo.hasVideos();
    
    if(BrowserDetect.usebrowser == "firefox")
      return Promise.resolve({response: {"hasVideos": anyVideos }});

    sendResponse({response: {"hasVideos":anyVideos}});
    return true;
  }
  else if(message.cmd == "get-config"){
    
    var config = {};
    config.videoAlignment = Settings.miscFullscreenSettings.videoFloat;
    config.arConf = {};
    config.arConf.enabled_global = Settings.arDetect.enabled == "global";
    
    var keybinds = Keybinds.getKeybinds();
    if(Debug.debug)
      console.log("[uw-bg::_uwbg_rcvmsg] Keybinds.fetch returned this:", keybinds); 
    
    config.keyboardShortcuts = keybinds;
    
    // predvidevajmo, da je enako. Če je drugače, bomo popravili ko dobimo odgovor
    // assume current is same as global & change that when you get response from content script
    config.arConf.enabled_current = ArDetect.isRunning();
    
    if(BrowserDetect.usebrowser == "firefox")
      return Promise.resolve({response: config});
    
    sendResponse({response: config});
    return true;
  }

  else if(message.cmd == "force-ar"){
    if(Debug.debug)
      console.log("[uw::receiveMessage] we're being commanded to change aspect ratio to", message.newAr);
    
    if(message.newAr == "auto"){
      ArDetect.stop();        // just in case
      ArDetect.arSetup();
    }
    else{
      ArDetect.stop();
      
      // we aren't in full screen, but we will want aspect ratio to be fixed when we go to 
      Resizer.setFsAr(message.newAr);
    }
  }
  else if(message.cmd == "force-video-float"){
    if(Debug.debug)
      console.log("[uw::receiveMessage] we're aligning video to", message.newFloat);
    
    Settings.miscFullscreenSettings.videoFloat = message.newFloat;
    Settings.save();
  }
  else if(message.cmd == "stop-autoar"){
    ArDetect.stop();
  }
  else if(message.cmd == "reload-settings"){
    Settings.reload();
  }
  
  if(message.cmd == "testing"){
    if(Browserdetect.usebrowser = "firefox")
      return Promise.resolve({response: "test response hier"});
    
    sendResponse({response: "test response hier"});
    return true;
  }
}



main();
