console.log("blabla");

async function main(){
  if(Debug.debug)
    console.log("[uw-bg::main] setting up background script");
  
  await Settings.init();
  
  
  
  
  browser.tabs.onActivated.addListener(_uwbg_onTabSwitched);
  
  if(Debug.debug)
    console.log("[uw-bg::main] listeners registered");
}

async function _uwbg_onTabSwitched(activeInfo){
  if(Debug.debug)
    console.log("[uw-bg::onTabSwitched] TAB CHANGED, GETTING INFO FROM MAIN TAB");
  
  var tabId = activeInfo.tabId;   // just for readability
  
  Comms.sendToEach({"cmd":"has-video"});
}

async function _uwbg_rcvmsg(message){
  return;
  if(Debug.debug){
    console.log("[uw-bg::_uwbg_rcvmsg] received message", message);
  }
  
  message.sender = "uwbg";
  message.receiver = "uw";
  
  if(message.cmd == "has-videos"){
    var response = await sendMessage(message);
    
    if(Debug.debug){
      console.log("[uw-bg::_uwbg_rcvmsg] received response for message", message, "response is this -->", response);
    }
      
    return Promise.resolve(response);
  }
  
  if(message.cmd == "get-config"){
    var config = {};
    config.videoAlignment = Settings.miscFullscreenSettings.videoFloat;
    config.arConf = {};
    config.arConf.enabled_global = Settings.arDetect.enabled == "global";
    
    var keybinds = await Keybinds.fetch();
    if(Debug.debug)
      console.log("[uw-bg::_uwbg_rcvmsg] Keybinds.fetch returned this:", keybinds); 
    
    config.keyboardShortcuts = keybinds;
    
    
    // predvidevajmo, da je enako. Če je drugače, bomo popravili ko dobimo odgovor
    // assume current is same as global & change that when you get response from content script
    config.arConf.enabled_current = Settings.arDetect.enabled == "global";
    
    try{
      message.cmd = "get-ardetect-active";
      var response = await sendMessage(message);
      if(Debug.debug){
        console.log("[uw-bg::_uwbg_rcvmsg] received response to get-ardetect-active!", {message: message, response: response});
      }
      config.arConf.enabled_current = response.response.arDetect_active;
      
    }
    catch(ex){
      if(Debug.debug)
        console.log("%c[uw-bg::_uwbg_rcvmsg] there was something wrong with request for get-ardetect-active.", "color: #f00", ex);
    }
  
    return Promise.resolve({response: config});
  }
  else if(message.cmd == "force-ar"){
    sendMessage(message);  // args: {cmd: string, newAr: number/"auto"}
  }
  else if(message.cmd == "stop-autoar"){
    sendMessage(message);
  }
  else if(message.cmd == "force-video-float"){
    if(message.global){
      Settings.miscFullscreenSettings.videoFloat = message.newFloat;
      sendMessage(message);
    }
    else{
      sendMessage(message);
    }
  }
  
  else if(message.cmd == "disable-autoar"){
    Settings.arDetect.enabled = "no";
    Settings.save();
    sendMessage("reload-settings");
  }
  else if(message.cmd == "disable-autoar-whitelist-only"){
    Settings.arDetect.enabled = "whitelist";
    Settings.save();
    sendMessage("reload-settings");
  }
  else if(message.cmd == "enable-autoar"){
    Settings.arDetect.enabled = "global";
    Settings.save();
    sendMessage("reload-settings");
  }
}


main();
