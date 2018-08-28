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
var settings;

async function init(){
  if(Debug.debug)
    console.log("[uw::main] loading configuration ...");


  settings = new Settings();
  await settings.init();

  comms = new CommsClient('content-client-port', settings);

  // load settings
  // var settingsLoaded = await comms.requestSettings();
  // if(!settingsLoaded){
  //   if(Debug.debug) {
  //     console.log("[uw::main] failed to get settings (settingsLoaded=",settingsLoaded,") Waiting for settings the old fashioned way");
  //   }
  //   comms.requestSettings_fallback();
  //   await comms.waitForSettings();
  //   if(Debug.debug){
  //     console.log("[uw::main] settings loaded.");
  //   }
  // }

  // if(Debug.debug)
  //   console.log("[uw::main] configuration should be loaded now");

  
  
  console.log("SETTINGS SHOULD BE LOADED NOW!", settings)

  // če smo razširitev onemogočili v nastavitvah, ne naredimo ničesar
  // If extension is soft-disabled, don't do shit
  if(! settings.canStartExtension()){
    if(Debug.debug) {
      console.log("[uw::init] EXTENSION DISABLED, THEREFORE WONT BE STARTED")
    }
    return;
  }

  try {
    pageInfo = new PageInfo(comms, settings);
  } catch (e) {
    console.log("[uw::init] FAILED TO START EXTENSION. Error:", e);
  }

  if(Debug.debug){
    console.log("[uw.js::setup] pageInfo initialized. Here's the object:", pageInfo);
  }
}
init();
