if(Debug.debug){
  console.log("\n\n\n\n\n\n           ———    Sᴛλʀᴛɪɴɢ  Uʟᴛʀᴀᴡɪᴅɪꜰʏ    ———\n               <<   ʟᴏᴀᴅɪɴɢ ᴍᴀɪɴ ꜰɪʟᴇ   >>\n\n\n\n");
  try {
    if(window.self !== window.top){
      console.log("%cWe aren't in an iframe.", "color: #afc, background: #174");
    }
    else{
      console.log("%cWe are in an iframe!", "color: #fea, background: #d31", window.self, window.top);
    }
  } catch (e) {
    console.log("%cWe are in an iframe!", "color: #fea, background: #d31");
  }
}



async function init(){
  if(Debug.debug)
    console.log("[uw::main] loading configuration ...");

  // load settings
  var isSlave = true;
  await Settings.init(isSlave);

  // za sporočilca poslušamo v vsakem primeru, tudi če je razširitev na spletnem mestu onemogočena
  // we listen for messages in any case, even if extension is disabled on current site. 
  browser.runtime.onMessage.addListener(receiveMessage);  

  await SitesConf.init();
  // če je trenutno mesto onemogočeno, potem zaključimo na tem mestu
  // if current site is disabled, we quit here
  
  if(! SitesConf.isEnabled(window.location.hostname)){
    if(Debug.debug)
      console.log("[uw:main] | site", window.location.hostname, "is blacklisted.");

    return;
  } 



  await Keybinds.init();

  if(Debug.debug)
    console.log("[uw::main] configuration should be loaded now");

  
  // setup the extension
  setup();
}

var pageInfo;

async function setup(){
  
  pageInfo = new PageInfo();

  if(Debug.debug){
    console.log("[uw.js::setup] pageInfo initialized. Here's the object:", pageInfo);
  }
  
  // if(ExtensionConf.arDetect.mode == "blacklist"){
  //   if(Debug.debug)
  //     console.log("[uw::main] Aspect ratio detection is enabled (mode=",ExtensionConf.arDetect.mode,"). Starting ArDetect");
  //   ArDetect.arSetup();
  // }
  // else{
  //   if(Debug.debug)
  //     console.log("[uw::main] Aspect ratio detection is disabled. Mode:", ExtensionConf.arDetect.mode);
  // }
  
  
  
}


// tukaj gledamo, ali se je velikost predvajalnika spremenila. Če se je, ponovno prožimo resizer
// here we check (in the most ghetto way) whether player size has changed. If it has, we retrigger resizer.

// var _video_recheck_counter = 5;
// var _video_recheck_period = 1;  // on this many retries

// function ghettoOnChange(){
  
//   if(_video_recheck_counter++ > _video_recheck_period){
//     _video_recheck_counter = 0;
    
//     if ( GlobalVars.video == null || 
//          GlobalVars.video == undefined ||
//          GlobalVars.video.videoWidth == 0 ||
//          GlobalVars.video.videoHeight == 0 ){
      
//       var video = document.getElementsByTagName("video")[0];
//       if ( video !== undefined &&
//            video !== null && 
//            video.videoWidth > 0 &&
//            video.videoHeight > 0 ){
//         if(Debug.debug){
//           console.log("%c[uw::ghettoOnChange] detected video. registering!", "color: #99f, background: #000");
//           console.log("[uw::ghettoOnChange] just for shits and giggles, let's see what's happened with GlobalVars.playerDimensions:", GlobalVars.playerDimensions)
//         }
        
//         // zaznali smo novo <video> značko. Zaradi tega bomo resetirali GlobalVars.playerDimensions
//         // a new <video> has been detected. We'll be resetting GlobalVars.playerDimensions
//         GlobalVars.playerDimensions = PlayerDetect.getPlayerDimensions(video);

//         GlobalVars.video = video;
//         Comms.sendToBackgroundScript({"cmd":"register-video"});
//       }
//     }
//   }
  
//   if(! GlobalVars.video)
//     return;
  
//   if(GlobalVars.playerDimensions == null){
//     GlobalVars.playerDimensions = PlayerDetect.getPlayerDimensions( GlobalVars.video );
    
    
//     if(GlobalVars.playerDimensions == undefined){
//       GlobalVars.playerDimensions = null;
//       return;
//     }
//   }
// }

// function ghettoUrlWatcher(){
//   if (GlobalVars.lastUrl != window.location.href){
//     if(Debug.debug){
//       console.log("[uw::ghettoUrlWatcher] URL has changed. Trying to retrigger autoAr");
//     }
    
//     GlobalVars.video = null;
//     GlobalVars.lastUrl = window.location.href;
//     // Resizer.reset();
//     main();
//   }
// }








// comms
function receiveMessage(message, sender, sendResponse) {
  if(Debug.debug)
    console.log("[uw::receiveMessage] we received a message.", message);
  
  if(message.cmd == "has-videos"){
    var anyVideos = GlobalVars.video != null;
    
    if(Debug.debug)
      console.log("[uw::receiveMessage] are there any videos on this page?", anyVideos, GlobalVars.video, this);
    
    if(BrowserDetect.usebrowser == "firefox")
      return Promise.resolve({response: {"hasVideos": anyVideos }});

    try{
      sendResponse({response: {"hasVideos":anyVideos}});
      return true;
    }
    catch(chromeIsShitError){}
    return;
  }
  else if(message.cmd == "get-config"){
    
    var config = {};
    config.videoAlignment = ExtensionConf.miscFullscreenSettings.videoFloat;
    config.arConf = {};
    config.arConf.enabled_global = ExtensionConf.arDetect.enabled == "global";
    
    
    var keybinds = Keybinds.getKeybinds();
    if(Debug.debug)
      console.log("[uw-bg::_uwbg_rcvmsg] Keybinds.fetch returned this:", keybinds); 
    
    config.keyboardShortcuts = keybinds;
    
    // predvidevajmo, da je enako. Če je drugače, bomo popravili ko dobimo odgovor
    // assume current is same as global & change that when you get response from content script
    config.arConf.enabled_current = ArDetect.isRunning();
    
    if(BrowserDetect.usebrowser == "firefox")
      return Promise.resolve({response: config});
    
    try{
      sendResponse({response: config});
    }
    catch(chromeIsShitError){};
    
    return true;
  }

  else if(message.cmd == "force-ar"){
    if(Debug.debug)
      console.log("[uw::receiveMessage] we're being commanded to change aspect ratio to", message.newAr);
    
    if(message.arType == "legacy"){
      ArDetect.stop();
      Resizer.legacyAr(message.newAr);
    }
    else{
      ArDetect.stop();
      Resizer.setAr(message.newAr);
    }
  }
  else if(message.cmd == "force-video-float"){
    if(Debug.debug)
      console.log("[uw::receiveMessage] we're aligning video to", message.newFloat);
    
    ExtensionConf.miscFullscreenSettings.videoFloat = message.newFloat;
    Settings.save(ExtensionConf);
  }
  else if(message.cmd == "stop-autoar"){
    ArDetect.stop();
  }
  else if(message.cmd == "update-settings"){
    if(Debug.debug){
      console.log("[uw] we got sent new ExtensionConf to abide by:", cmd.newConf);
    }
    ExtensionConf = cmd.newConf;
  }
//   else if(message.cmd == "enable-autoar"){
//     if(Debug.debug){
//       console.log("[uw] enabling autoar.");
//     }
//     ExtensionConf.autoAr.mode == "blacklist";
//     Settings.save(ExtensionConf);
//   }
//   else if(message.cmd == "disable-autoar"){
//     if(Debug.debug){
//       console.log("[uw] disabling autoar.");
//     }
//     ExtensionConf.autoAr.mode == "disabled";
//     Settings.save(ExtensionConf);
//   }
  if(message.cmd == "testing"){
    if(Browserdetect.usebrowser = "firefox")
      return Promise.resolve({response: "test response hier"});
    
    sendResponse({response: "test response hier"});
    return true;
  }
}


// $(document).ready(function() {
  init();
// });
