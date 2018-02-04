var BgVars = {
  arIsActive: true,
  hasVideos: false,
  currentSite: ""
}

function extractHostname(url){
  // extract hostname  
  if (url.indexOf("://") > -1) {    //find & remove protocol (http, ftp, etc.) and get hostname
    hostname = url.split('/')[2];
  }
  else {
    hostname = url.split('/')[0];
  }
  
  hostname = hostname.split(':')[0];   //find & remove port number
  hostname = hostname.split('?')[0];   //find & remove "?"
  
  return hostname;
}

async function main(){
  if(Debug.debug)
    console.log("[uw-bg::main] setting up background script");
  
  await Settings.init();
  await Keybinds.init();
  Keybinds.keybinds = await Keybinds.fetch();
  
  
  // Poslušalci za dogodke       |      event listeners here
  // {===]///[-------------------------------------]\\\[===}
  
  browser.runtime.onMessage.addListener(_uwbg_rcvmsg);
  browser.tabs.onActivated.addListener(_uwbg_onTabSwitched);
  
  if(Debug.debug)
    console.log("[uw-bg::main] listeners registered");
  
  // add currentSite
  var tabs = await Comms.getActiveTab();
  BgVars.currentSite = extractHostname(tabs[0].url);
  
}

async function _uwbg_onTabSwitched(activeInfo){
  BgVars.hasVideos = false;
  if(Debug.debug)
    console.log("[uw-bg::onTabSwitched] TAB CHANGED, GETTING INFO FROM MAIN TAB");
  
  
  var tabId = activeInfo.tabId;   // just for readability
  
  var tab = await browser.tabs.get(tabId);
  
  BgVars.currentSite = extractHostname(tab.url);
  
  // this can fail. This might also not return a promise? Check that.
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

async function _uwbg_check4videos(){
  if(BgVars.hasVideos)
    return;
  
  var videoFrameList = Comms.sendToEach({"cmd":"has-videos"});
  
  if(Debug.debug)
    console.log("[uw-bg::check4videos] got updated list of frames and whether they have videos", videoFrameList);
  
  var hasVideos = false;
  for(frame of videoFrameList){
    hasVideos |= frame.response.hasVideos;
  }
  
  BgVars.hasVideos = hasVideos;
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
      console.log("[uw-bg::_uwbg_rcvmsg] Keybinds.getKeybinds() returned this:", Keybinds.getKeybinds()); 
    
    config.keyboardShortcuts = Keybinds.getKeybinds();
    
    
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
  
  else if(message.cmd == "uw-enabled-for-site"){
    var wlindex = Settings.whitelist.indexOf(BgVars.currentSite);
    var blindex = Settings.blacklist.indexOf(BgVars.currentSite);
    
    var mode = "default";
    if(wlindex > -1)
      mode = "whitelist";
    if(blindex > -1)
      mode = "blacklist";
    
    if(Debug.debug){
      console.log("[uw::receiveMessage] is this site: ", BgVars.currentSite, "\n\n", "whitelisted or blacklisted? whitelist:", (wlindex > -1), "; blacklist:", (blindex > -1), "; mode (return value):", mode, "\nwhitelist:",Settings.whitelist,"\nblacklist:",Settings.blacklist);
      
    }
    
    if(BrowserDetect.usebrowser == "firefox")
      return Promise.resolve({response: mode});
    
    try{
      sendResponse({response: mode});
    }
    catch(chromeIsShitError){};
    
    return true;
  }
  else if(message.cmd == "enable-for-site"){
    var wlindex = Settings.whitelist.indexOf(BgVars.currentSite);
    var blindex = Settings.blacklist.indexOf(BgVars.currentSite);
    
    if(wlindex > -1)
      Settings.whitelist.splice(BgVars.currentSite, 1);
    if(blindex > -1)
      Settings.blacklist.splice(BgVars.currentSite, 1);
    
    if(message.option == "whitelist")
      Settings.whitelist.push(BgVars.currentSite);
    if(message.option == "blacklist")
      Settings.blacklist.push(BgVars.currentSite);
    
    Settings.save();
  }
  
}


main();
