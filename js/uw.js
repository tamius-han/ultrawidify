if(Debug.debug)
  console.log("\n\n\n\n\n\n           ———    Sᴛλʀᴛɪɴɢ  Uʟᴛʀᴀᴡɪᴅɪꜰʏ    ———\n               <<   ʟᴏᴀᴅɪɴɢ ᴍᴀɪɴ ꜰɪʟᴇ   >>\n\n\n\n");

// load all settings from localStorage:


// start autoar and setup everything


$(document).ready(function() {
  if(Debug.debug)
    console.log("uw::document.ready | document is ready. Starting ar script ...");
//  
  
  if(SitesConf.getMode(window.location.hostname) == "blacklist" ){
    if(Debug.debug)
      console.log("uw::document.ready | site", window.location.hostname, "is blacklisted.");

    return;
  }
  
  if( ExtensionConf.getMode() == "none" ){
    if(Debug.debug)
      console.log("uw::document.ready | Extension is soft-disabled via popup");
    
    return;
  }
  if( ExtensionConf.getMode() == "whitelist" && SitesConf.getMode(window.location.hostname) != "whitelist"){
    if(Debug.debug)
      console.log("uw::document.ready | extension is set to run on whitelisted sites only, but site ", window.location.hostname, "is not on whitelist.");
    
    return;
  }
  
  ArDetect.arSetup();
  
  
  document.addEventListener("mozfullscreenchange", function( event ) {
    if(FullScreenDetect.isFullScreen()){
      // full screen is on
    }
    else{
      Resizer.reset();
    }
  });
  
});
