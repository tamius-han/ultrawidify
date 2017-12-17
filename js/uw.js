if(Debug.debug)
  console.log("\n\n\n\n\n\n           ———    Sᴛλʀᴛɪɴɢ  Uʟᴛʀᴀᴡɪᴅɪꜰʏ    ———\n               <<   ʟᴏᴀᴅɪɴɢ ᴍᴀɪɴ ꜰɪʟᴇ   >>\n\n\n\n");

// load all settings from localStorage:

async function main(){
  if(Debug.debug)
    console.log("loading configuration ...");

  // load settings
  Settings.init();
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
    if(FullScreenDetect.isFullScreen()){
      // full screen is on
    }
    else{
      Resizer.reset();
    }
  });
  
// });
}

main();
