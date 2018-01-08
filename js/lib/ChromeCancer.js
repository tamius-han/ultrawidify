// Chrome's tabs.sendMessage() and runtime.sendMessage() APIs are pure cancer
// attempts to make those two work like their Firefox counterparts have failed
//
// because Chrome's implementation of tabs.sendMessage() and runtime.sendMessage()
// make code less nice and more prone to turn into spaghetti _all_ chrome functions
// dealing with these have been moved to this file. Don't forget to include in manifest.
//
// 
// welcome to callback hell


var _cancer_hasVideos_lastValue = undefined;
var _cancer_arActive_lastValue = undefined;

async function _cancer_recvmsg(message, sender, sendResponse){
  
  if(Debug.debug){
    console.log("[ChromeCancer::_cancer_recvmsg] received message", message);
    
  }
  
  var tabs = await Comms.queryTabs({currentWindow: true, active: true}); 
    
  message.sender = "uwbg";
  message.receiver = "uw";
  
  if(message.cmd == "has-videos"){
    
    if(tabs.length == 0)
      return false;
    
    chrome.tabs.sendMessage(tabs[0].id, message, /*options,*/ function(response){
      if(Debug.debug)
        console.log("[ChromeCancer::_cancer_recvmsg] received response for -- has-videos -- ", response);
        
      var resp = {response: response};
      
      if(Debug.debug)
        console.log("[ChromeCancer::_cancer_recvmsg] sending response for -- has-videos -- ", response);
      
      _cancer_hasVideos_lastValue = response.response;
      sendResponse(resp);
    });
  }
  if(message.cmd == "has-videos-cancer"){
    var resp = {response: _cancer_hasVideos_lastValue};
    sendResponse(resp);
  }
  
  if(message.cmd == "get-config-cancer"){
    var resp = _cancer_arActive_lastValue;
    sendResponse(resp);
  }
  
  if(message.cmd == "get-config"){
    if (tabs.length == 0)
      return false;
    
    message.cmd = "get-ardetect-active";
    var config = {};
    config.videoAlignment = Settings.miscFullscreenSettings.videoFloat;
    config.arConf = {};
    config.arConf.enabled_global = Settings.arDetect.enabled == "global";
    
    var keybinds = await Keybinds.fetch();
    if(Debug.debug)
      console.log("[ChromeCancer::_cancer_recvmsg] Keybinds.fetch returned this:", keybinds); 
    
    config.keyboardShortcuts = keybinds;
    
    
    
    // predvidevajmo, da je enako. Če je drugače, bomo popravili ko dobimo odgovor
    // assume current is same as global & change that when you get response from content script
    config.arConf.enabled_current = Settings.arDetect.enabled == "global";
    
    chrome.tabs.sendMessage(tabs[0].id, message, /*options,*/ function(response){
      if(Debug.debug){
        console.log("[ChromeCancer::_cancer_recvmsg] (callback) config so far:", config);
      }
      
      if(response !== undefined){
        config.arConf.enabled_current = response.response.arDetect_active;
      }
      else if(Debug.debug){
        console.log("[ChromeCancer::_cancer_recvmsg] (callback) response undefined:", response);
      }
      
      var resp = {response: config};
      if(Debug.debug)
        console.log("[ChromeCancer::_cancer_recvmsg] sending response for -- get-config --", resp);
      
      _cancer_aractive_lastValue = resp;
      sendResponse(resp);
    });
  }
  else if(message.cmd == "force-ar"){
    if (tabs.length == 0)
      return false;
    
    chrome.tabs.sendMessage(tabs[0].id, message); // args: {cmd: string, newAr: number/"auto"}
  }
  
  else if(message.cmd == "stop-autoar"){
    if (tabs.length == 0)
      return false;
    
    chrome.tabs.sendMessage(tabs[0].id, message); 
  }
  else if(message.cmd == "force-video-float"){
    if (tabs.length == 0)
      return false;
    
    if(message.global){
      Settings.miscFullscreenSettings.videoFloat = message.newFloat;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, message); 
  }
  
  else if(message.cmd == "disable-autoar"){
    Settings.arDetect.enabled = "no";
    Settings.save();
    
    if (tabs.length == 0)
      return false;
    chrome.tabs.sendMessage(tabs[0].id, "reload-settings");
  }
  else if(message.cmd == "disable-autoar-whitelist-only"){
    Settings.arDetect.enabled = "whitelist";
    Settings.save();
    
    if (tabs.length == 0)
      return false;
    chrome.tabs.sendMessage(tabs[0].id, "reload-settings");
  }
  else if(message.cmd == "enable-autoar"){
    Settings.arDetect.enabled = "global";
    Settings.save();
    
    if (tabs.length == 0)
      return false;
    chrome.tabs.sendMessage(tabs[0].id, "reload-settings");
  }
  
}

function _cancer_content_receiveMessage(message, sender, sendResponse){
  if(Debug.debug)
    console.log("[ChromeCancer::receiveMessage_cs] ] we received a message.", message);
  
  
  if(message.cmd == "has-videos"){
    var anyVideos = PageInfo.hasVideos();
    
    var resp = {response: {"hasVideos": anyVideos }};
    
    if(Debug.debug)
      console.log("[ChromeCancer::receiveMessage_cs] ] sending response for has-videos:",resp);
    
    sendResponse(resp);
    
  }
  else if(message.cmd == "get-ardetect-active"){
    var arDetect_active = ArDetect.isRunning();
    
    var resp = {response: {"arDetect_active": arDetect_active }}
    if(Debug.debug)
      console.log("[ChromeCancer::receiveMessage_cs] ] sending response for get-ardetect-active:",resp);
    sendResponse(resp);
    
  }
  else if(message.cmd == "force-ar"){
    if(Debug.debug)
      console.log("[ChromeCancer::receiveMessage_cs] ] we're being commanded to change aspect ratio to", message.newAr);
    
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
      console.log("[ChromeCancer::receiveMessage_cs] ] we're aligning video to", message.newFloat);
    
    Settings.miscFullscreenSettings.videoFloat = message.newFloat;
    Settings.save();
  }
  else if(message.cmd == "stop-autoar"){
    ArDetect.stop();
  }
  else if(message.cmd == "reload-settings"){
    Settings.reload();
  }
}

function _cancer_check4conf(){
  var command = {};
  command.cmd = "get-config";
  command.sender = "popup";
  command.receiver = "uwbg";
  
  
  browser.runtime.sendMessage(command, function(response){
    if(response){
      if(Debug.debug)
        console.log("[ChromeCancer::check4conf] received response:",response);

      loadConfig(response.response);
    }
    else{
      if(Debug.debug)
        console.log("%c[ChromeCancer::check4conf] sending message failed. retrying in 1s ... -- response for get-config:", "color: #f00", response);
      
      setTimeout(_cancer_check4conf, 1000);
    }
  });
}

function _cancer_check4videos(){
  
  var command = {};
  command.cmd = "has-videos";
  command.sender = "popup";
  command.receiver = "uwbg";
  
  browser.runtime.sendMessage(command, function(response){
    if(response){
      if(Debug.debug)
        console.log("[ChromeCancer::check4videos] received response:",response);
      
      if(response.response.hasVideos){
        hasVideos = true;
        openMenu(selectedMenu);
      }
    }
    else{
      if(Debug.debug)
        console.log("%c[ChromeCancer::check4conf] sending message failed. retrying in 1s ... -- response for has-videos:", "color: #f00", response);
      
      setTimeout(_cancer_check4videos, 1000);
    }
  });
}

function _cancer_check4conf2(){
  var command = {};
  command.cmd = "get-config-cancer";
  command.sender = "popup";
  command.receiver = "uwbg";
  
  
  browser.runtime.sendMessage(command, function(response){
    if(response){
      if(Debug.debug)
        console.log("[ChromeCancer::check4conf2 (cancer edit)] received response:",response);

      loadConfig(response.response);
    }
    else{
      if(Debug.debug)
        console.log("%c[ChromeCancer::check4conf (cancer edit)] sending message failed. retrying in 1s ... -- response for get-config:", "color: #f00", response, chrome.extension.lastError);
      
      setTimeout(_cancer_check4conf2, 1000);
    }
  });
}

function _cancer_check4videos2(){
  
  var command = {};
  command.cmd = "has-videos-cancer";
  command.sender = "popup";
  command.receiver = "uwbg";
  
  browser.runtime.sendMessage(command, function(response){
    if(response){
      if(Debug.debug)
        console.log("[ChromeCancer::check4videos2 (cancer edit)] received response:",response);
      
      if(response.response.hasVideos){
        hasVideos = true;
        openMenu(selectedMenu);
      }
    }
    else{
      if(Debug.debug)
        console.log("%c[ChromeCancer::check4conf2 (cancer edit)] sending message failed. retrying in 1s ... -- response for has-videos-cancer:", "color: #f00", response);
      
      setTimeout(_cancer_check4videos2, 1000);
    }
  });
}




var ChromeCancer = {
  recvmsg: _cancer_recvmsg,
  receiveMessage_cs: _cancer_content_receiveMessage,
  check4conf: _cancer_check4conf,
  check4videos: _cancer_check4videos,
  check4videos2: _cancer_check4videos2,
  check4conf2: _cancer_check4conf2
}
