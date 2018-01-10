// Chrome's tabs.sendMessage() and runtime.sendMessage() APIs are pure cancer
// attempts to make those two work like their Firefox counterparts have failed
//
// because Chrome's implementation of tabs.sendMessage() and runtime.sendMessage()
// make code less nice and more prone to turn into spaghetti _all_ chrome functions
// dealing with these have been moved to this file. Don't forget to include in manifest.
//
// 
// welcome to callback hell

var _cancer_popup_port;
var _cancer_uwbg_popup_port;

var _cancer_popup_handleCallbacks = function (message){
  if(message.cmd == "has-video-response"){
    if(message.response){
      if(message.response.hasVideos){
        hasVideos = true;
        openMenu();
      }
    }
  }
  if(message.cmd == "get-config-response"){
    if(message.response){
      loadConfig(message.response);
    }
  }
}

var _cancer_init_popup = function() {
  var _cancer_popup_port = browser.runtime.connect({name: "_uw_bg_popup"});
  
  _cancer_popup_port.onMessage.addListener(_cancer_handleCallbacks);
}



/*
var ChromeCancer = {
  recvmsg: _cancer_recvmsg,
  receiveMessage_cs: _cancer_content_receiveMessage,
  check4conf: _cancer_check4conf,
  check4videos: _cancer_check4videos,
  check4videos2: _cancer_check4videos2,
  check4conf2: _cancer_check4conf2
}*/
