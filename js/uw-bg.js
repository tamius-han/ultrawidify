async function main(){
  if(Debug.debug)
    console.log("[uw-bg::main] setting up background script");
  
  await Settings.init();
  
  browser.runtime.onMessage.addListener(_uwbg_rcvmsg);
  
  if(Debug.debug)
    console.log("[uw-bg::main] listeners registered");
}

async function sendMessage(message){
  var tabs = await browser.tabs.query({currentWindow: true, active: true});
  
  if(Debug.debug)
    console.log("[uw-bg::sendMessage] trying to send message", message, " to tab ", tabs[0], ". (all tabs:", tabs,")");

  var response = await browser.tabs.sendMessage(tabs[0].id, message);
  return response;
}

async function _uwbg_rcvmsg(message){
  
  if(Debug.debug){
    console.log("[uw-bg::_uwbg_rcvmsg] received message", message);
    
  }
  
  message.sender = "uwbg";
  message.receiver = "uw";
  
  if(message.cmd == "has-videos"){
    var response = await sendMessage(message);
    if(Debug.debug){
      console.log("[uw-bg::_uwbg_rcvmsg] received response!", message);
    }
    return Promise.resolve(response);
  }
  if(message.cmd == "get-config"){
    
    var config = {};
    config.videoAlignment = Settings.miscFullscreenSettings.videoFloat;
    config.arConf = {};
    config.arConf.enabled_global = Settings.arDetect.enabled == "global";
    
    
    
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
