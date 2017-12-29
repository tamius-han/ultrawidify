if(Debug.debug)
  console.log("\n\n\n\n\n\n           ———    Sᴛλʀᴛɪɴɢ  Uʟᴛʀᴀᴡɪᴅɪꜰʏ    ———\n               <<   ʟᴏᴀᴅɪɴɢ ᴍᴀɪɴ ꜰɪʟᴇ   >>\n\n\n\n");

// load all settings from localStorage:

async function main(){
  if(Debug.debug)
    console.log("[uw::main] loading configuration ...");

  // load settings
  await Settings.init();
  var scpromise = SitesConf.init();
  var kbpromise = Keybinds.init();
  
  ExtensionConf.init();
  console.log(scpromise);

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
  
  
  
  
  ArDetect.arSetup();
  
  document.addEventListener("mozfullscreenchange", function( event ) {
    if(Debug.debug){
//       console.log("[uw::mozfullscreenchange] full screen state is changing. event:", event);
      console.log("[uw::mozfullscreenchange] are we in full screen?", FullScreenDetect.isFullScreen());
    }
    
    if(FullScreenDetect.isFullScreen()){
      // full screen is on
      Resizer.restore();
    }
    else{
      Resizer.reset();
    }
  });
  
  browser.runtime.onMessage.addListener(receiveMessage);
// });
}


// comms
function receiveMessage(message) {
  if(Debug.debug)
    console.log("[uw::receiveMessage] we received a message.", message);
  
  if(message.cmd == "force-ar"){
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
  if(message.cmd == "force-video-float"){
    if(Debug.debug)
      console.log("[uw::receiveMessage] we're aligning video to", message.newFloat);
    
    Settings.miscFullscreenSettings.videoFloat = message.newFloat;
    Settings.save();
  }
  if(message.cmd == "stop-autoar"){
    ArDetect.stop();
  }
  if(message.cmd == "reload-settings"){
    Settings.reload();
  }
}

main();
