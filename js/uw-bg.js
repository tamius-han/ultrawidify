var BgVars = {
  arIsActive: true,
  hasVideos: false
  
}

async function main(){
  if(Debug.debug)
    console.log("[uw-bg::main] setting up background script");
  
  await Settings.init();
  await Keybinds.init();
  
  // Poslušalci za dogodke       |      event listeners here
  // {===]///[-------------------------------------]\\\[===}
  
  browser.runtime.onMessage.addListener(_uwbg_rcvmsg);
  browser.tabs.onActivated.addListener(_uwbg_onTabSwitched);
  
  if(Debug.debug)
    console.log("[uw-bg::main] listeners registered");
}

async function _uwbg_onTabSwitched(activeInfo){
  BgVars.hasVideos = false;
  if(Debug.debug)
    console.log("[uw-bg::onTabSwitched] TAB CHANGED, GETTING INFO FROM MAIN TAB");
  
  var tabId = activeInfo.tabId;   // just for readability
  
  var videoFrameList = await Comms.sendToEach({"cmd":"has-videos"}, tabId);
  
  if(Debug.debug)
    console.log("[uw-bg::onTabSwitched] got list of frames and whether they have videos", videoFrameList);
  
  // Pogledamo, če kateri od okvirjev vsebuje video. Da omogočimo pojavno okno je zadosti že
  // en okvir z videom.
  //                <===[///]----------------------------[\\\]===>
  // Check if any frame has a video in it. To enable the popup there only needs to be at least one,
  // but the popup controls all frames.
  var hasVideos = false;
  for(frame of videoFrameList){
    hasVideos |= frame.response.hasVideos;
  }
  
  BgVars.hasVideos = hasVideos;
  
  Settings.reload();
  // todo: change extension icon depending on whether there's a video on the page or not
}


async function _uwbg_registerVideo(tabId){
  var tabs = await Comms.getActiveTab();
  
  // če ukaz pride iz zavihka, na katerem se trenunto ne nahajamo, potem se za zahtevo ne brigamo
  // if command originated from a tab that's _not_ currently active, we ignore the request
  if(tabId != tabs[0].id){
    if(Debug.debug){
      console.log("[uw-bg::_uwbg_registerVideo] request didn't come from currently active tab, ignoring");
    }
    return;
  }
  
  BgVars.hasVideos = true;
  
  // todo: change extension icon depending on whether there's a video on the page or not
}

function _uwbg_rcvmsg(message, sender, sendResponse){
  if(Debug.debug){
    console.log("[uw-bg::_uwbg_rcvmsg] received message", message, "from sender", sender);
  }
  
  message.sender = "uwbg";
  message.receiver = "uw";
  
  if(message.cmd == "has-videos"){
    if(Debug.debug){
      console.log("[uw-bg::_uwbg_rcvmsg] does this tab or any of its subframes have videos?", BgVars.hasVideos );
    }
    
    var res = {response: {hasVideos: BgVars.hasVideos}};
    if(BrowserDetect.firefox){
      return Promise.resolve(res);
    }
    sendResponse(res);
    return true;
  }
  
  if(message.cmd == "get-config"){
    var config = {};
    config.videoAlignment = Settings.miscFullscreenSettings.videoFloat;
    config.arConf = {};
    config.arConf.enabled_global = Settings.arDetect.enabled == "global";
    
    if(Debug.debug)
      console.log("[uw-bg::_uwbg_rcvmsg] Keybinds.fetch returned this:", keybinds); 
    
    config.keyboardShortcuts = BgVars.keyboardShortcuts;
    
    
    // predvidevajmo, da je enako. Če je drugače, bomo popravili ko dobimo odgovor
    // assume current is same as global & change that when you get response from content script
    config.arConf.enabled_current = Settings.arDetect.enabled == "global";
  
    var res = {response: config}
    if(BrowserDetect.firefox){
      return Promise.resolve(res);
    }
    sendMessage(res);
    return true;
  }
  
  if(message.cmd == "register-video"){
    // dobili smo sporočilce, ki pravi: "hej jaz imam video, naredi cahen" — ampak preden naredimo cahen,
    // se je potrebno prepričati, da je sporočilce prišlo iz pravilnega zavihka. Trenutno odprt zavihek
    // lahko dobimo to. ID zavihka, iz katerega je prišlo sporočilo, se skriva v sender.tab.id
    //                            ~<><\\\][=================][///><>~
    // we got a message that says: "hey I have a video, make a mark or something" — but before we do the
    // mark, we should check if the message has truly arrived from currently active tab. We can get the 
    // id of currently active tab here. ID of the sender tab is ‘hidden’ in sender.tab.id.
    
    _uwbg_registerVideo(sender.tab.id);
  }
//   else if(message.cmd == "force-ar"){
//     sendMessage(message);  // args: {cmd: string, newAr: number/"auto"}
//   }
//   else if(message.cmd == "stop-autoar"){
//     sendMessage(message);
//   }
//   else if(message.cmd == "force-video-float"){
//     if(message.global){
//       Settings.miscFullscreenSettings.videoFloat = message.newFloat;
//       sendMessage(message);
//     }
//     else{
//       sendMessage(message);
//     }
//   }
//   
//   else if(message.cmd == "disable-autoar"){
//     Settings.arDetect.enabled = "no";
//     Settings.save();
//     sendMessage("reload-settings");
//   }
//   else if(message.cmd == "disable-autoar-whitelist-only"){
//     Settings.arDetect.enabled = "whitelist";
//     Settings.save();
//     sendMessage("reload-settings");
//   }
//   else if(message.cmd == "enable-autoar"){
//     Settings.arDetect.enabled = "global";
//     Settings.save();
//     sendMessage("reload-settings");
//   }
}


main();
