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

    browser.tabs.sendMessage(tabs[0].id, message);
}

async function _uwbg_rcvmsg(message){
  
  if(Debug.debug){
    console.log("received message", message);
    
  }
  /*
  message.sender = "uwbg";
  message.receiver = "uw";*/
  
  if(message.cmd == "debug-ping"){
    
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
