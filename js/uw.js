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


var pageInfo;
var comms;

async function init(){
  if(Debug.debug)
    console.log("[uw::main] loading configuration ...");

  comms = new CommsClient('content-client-port');

  // load settings
  var settingsLoaded = await comms.requestSettings();
  if(!settingsLoaded){
    if(Debug.debug) {
      console.log("[uw::main] failed to get settings (settingsLoaded=",settingsLoaded,") Waiting for settings the old fashioned way");
    }
    comms.requestSettings_fallback();
    await comms.waitForSettings();
    if(Debug.debug){
      console.log("[uw::main] settings loaded.");
    }
  }

  if(Debug.debug)
    console.log("[uw::main] configuration should be loaded now");

  
  // če smo razširitev onemogočili v nastavitvah, ne naredimo ničesar
  // If extension is soft-disabled, don't do shit
  if(! canStartExtension()){
    if(Debug.debug) {
      console.log("[uw::init] EXTENSION DISABLED, THEREFORE WONT BE STARTED")
    }
    return;
  }

  pageInfo = new PageInfo();
  comms.setPageInfo(pageInfo);

  if(Debug.debug){
    console.log("[uw.js::setup] pageInfo initialized. Here's the object:", pageInfo);
  }
}


// comms
// function receiveMessage(message, sender, sendResponse) {
//   if(Debug.debug)
//     console.log("[uw::receiveMessage] we received a message.", message);
  
//   if(message.cmd == "has-videos"){
//     var anyVideos = GlobalVars.video != null;
    
//     if(Debug.debug)
//       console.log("[uw::receiveMessage] are there any videos on this page?", anyVideos, GlobalVars.video, this);
    
//     if(BrowserDetect.usebrowser == "firefox")
//       return Promise.resolve({response: {"hasVideos": anyVideos }});

//     try{
//       sendResponse({response: {"hasVideos":anyVideos}});
//       return true;
//     }
//     catch(chromeIsShitError){}
//     return;
//   }
//   else if(message.cmd == "get-config"){
    
//     var config = {};
//     config.videoAlignment = ExtensionConf.miscFullscreenSettings.videoFloat;
//     config.arConf = {};
//     config.arConf.enabled_global = ExtensionConf.arDetect.enabled == "global";
    
    
//     var keybinds = ExtensionConf.keyboard.shortcuts;
//     if(Debug.debug)
//       console.log("[uw-bg::_uwbg_rcvmsg] Keybinds.fetch returned this:", keybinds); 
    
//     config.keyboardShortcuts = keybinds;
    
//     // predvidevajmo, da je enako. Če je drugače, bomo popravili ko dobimo odgovor
//     // assume current is same as global & change that when you get response from content script
//     config.arConf.enabled_current = ArDetect.isRunning();
    
//     if(BrowserDetect.usebrowser == "firefox")
//       return Promise.resolve({response: config});
    
//     try{
//       sendResponse({response: config});
//     }
//     catch(chromeIsShitError){};
    
//     return true;
//   }

//   else if(message.cmd == "force-ar"){
//     if(Debug.debug)
//       console.log("[uw::receiveMessage] we're being commanded to change aspect ratio to", message.newAr);
    
//     if(message.arType == "legacy"){
//       ArDetect.stop();
//       Resizer.legacyAr(message.newAr);
//     }
//     else{
//       ArDetect.stop();
//       Resizer.setAr(message.newAr);
//     }
//   }
//   else if(message.cmd == "force-video-float"){
//     if(Debug.debug)
//       console.log("[uw::receiveMessage] we're aligning video to", message.newFloat);
    
//     ExtensionConf.miscFullscreenSettings.videoFloat = message.newFloat;
//     Settings.save(ExtensionConf);
//   }
//   else if(message.cmd == "stop-autoar"){
//     ArDetect.stop();
//   }
//   else if(message.cmd == "update-settings"){
//     if(Debug.debug){
//       console.log("[uw] we got sent new ExtensionConf to abide by:", cmd.newConf);
//     }
//     ExtensionConf = cmd.newConf;
//   }
// //   else if(message.cmd == "enable-autoar"){
// //     if(Debug.debug){
// //       console.log("[uw] enabling autoar.");
// //     }
// //     ExtensionConf.autoAr.mode == "blacklist";
// //     Settings.save(ExtensionConf);
// //   }
// //   else if(message.cmd == "disable-autoar"){
// //     if(Debug.debug){
// //       console.log("[uw] disabling autoar.");
// //     }
// //     ExtensionConf.autoAr.mode == "disabled";
// //     Settings.save(ExtensionConf);
// //   }
//   if(message.cmd == "testing"){
//     if(Browserdetect.usebrowser = "firefox")
//       return Promise.resolve({response: "test response hier"});
    
//     sendResponse({response: "test response hier"});
//     return true;
//   }
// }


init();
