var BgVars = {
  arIsActive: true,
  hasVideos: false,
  currentSite: ""
}

class UWServer {

  constructor() {
    this.ports = [];
    this.arIsActive = true;
    this.hasVideos = false;
    this.currentSite = "";
    this.setup();
  }

  async setup() {
    await Settings.init();
    this.comms = new CommsServer(this);


    var ths = this;
    if(BrowserDetect.firefox) {
      browser.tabs.onActivated.addListener((m) => ths.onTabSwitched(m));  
    } else if (BrowserDetect.chrome) {
      chrome.tabs.onActivated.addListener((m) => ths.onTabSwitched(m));
    }
  }

  async _promisifyTabsGet(browserObj, tabId){
    return new Promise( (resolve, reject) => {
      browserObj.tabs.get(tabId, (tab) => resolve(tab));
    });
  }

  extractHostname(url){
    var hostname;
    
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

  async onTabSwitched(activeInfo){
    this.hasVideos = false;

    if(Debug.debug)
      console.log("[uw-bg::onTabSwitched] TAB CHANGED, GETTING INFO FROM MAIN TAB");

    try {
    var tabId = activeInfo.tabId;   // just for readability

    var tab;
    if (BrowserDetect.firefox) {
      var tab = await browser.tabs.get(tabId);
    } else if (BrowserDetect.chrome) {
      var tab = await this._promisifyTabsGet(chrome, tabId);
    }

    this.currentSite = this.extractHostname(tab.url);
    } catch(e) {
      console.log(e);
    }

    if(Debug.debug) {
      console.log("TAB SWITCHED!", this.currentSite)
    }
    //TODO: change extension icon based on whether there's any videos on current page
  }

}

var server = new UWServer();



// async function main(){
//   if(Debug.debug)
//     console.log("[uw-bg::main] setting up background script");
  
  
//   Keybinds.keybinds = await Keybinds.fetch();
  
  
//   // Poslušalci za dogodke       |      event listeners here
//   // {===]///[-------------------------------------]\\\[===}
  
//   browser.runtime.onMessage.addListener(_uwbg_rcvmsg);
//   browser.tabs.onActivated.addListener(_uwbg_onTabSwitched);
  
//   if(Debug.debug)
//     console.log("[uw-bg::main] listeners registered");
  
//   // add currentSite
//   var tabs = await Comms.getActiveTab();
//   BgVars.currentSite = extractHostname(tabs[0].url);
  
//   // 
//   setInterval(_uwbg_check4videos, 5000);
// }

// async function _uwbg_onTabSwitched(activeInfo){
//   BgVars.hasVideos = false;
//   if(Debug.debug)
//     console.log("[uw-bg::onTabSwitched] TAB CHANGED, GETTING INFO FROM MAIN TAB");
  
  
//   var tabId = activeInfo.tabId;   // just for readability
  
//   var tab = await browser.tabs.get(tabId);
  
//   BgVars.currentSite = extractHostname(tab.url);
  
//   // this can fail. This might also not return a promise? Check that.
//   var videoFrameList = await Comms.sendToEach({"cmd":"has-videos"}, tabId);
  
//   if(Debug.debug)
//     console.log("[uw-bg::onTabSwitched] got list of frames and whether they have videos", videoFrameList);
  
//   // Pogledamo, če kateri od okvirjev vsebuje video. Da omogočimo pojavno okno je zadosti že
//   // en okvir z videom.
//   //                <===[///]----------------------------[\\\]===>
//   // Check if any frame has a video in it. To enable the popup there only needs to be at least one,
//   // but the popup controls all frames.

//   var hasVideos = false;
//   for(frame of videoFrameList){
//     hasVideos |= frame.response.hasVideos;
//   }
  
//   BgVars.hasVideos = hasVideos;
  
//   Settings.reload();
//   // todo: change extension icon depending on whether there's a video on the page or not
// }

// async function _uwbg_check4videos(){
//   if(BgVars.hasVideos)
//     return;
  
//   var videoFrameList = Comms.sendToEach({"cmd":"has-videos"});
  
//   if(Debug.debug)
//     console.log("[uw-bg::check4videos] got updated list of frames and whether they have videos", videoFrameList);
  
//   var hasVideos = false;
//   for(frame of videoFrameList){
//     hasVideos |= frame.response.hasVideos;
//   }
  
//   BgVars.hasVideos = hasVideos;
// }

// async function _uwbg_registerVideo(tabId){
//   var tabs = await Comms.getActiveTab();
  
//   // če ukaz pride iz zavihka, na katerem se trenunto ne nahajamo, potem se za zahtevo ne brigamo
//   // if command originated from a tab that's _not_ currently active, we ignore the request
//   if(tabId != tabs[0].id){
//     if(Debug.debug){
//       console.log("[uw-bg::_uwbg_registerVideo] request didn't come from currently active tab, ignoring");
//     }
//     return;
//   }
//   if(Debug.debug){
//     console.log("%c[uw-bg::_uwbg_registerVideo] request came from currently active tab!", "color: #afd, background: #000");
//   }
//   BgVars.hasVideos = true;
  
//   // todo: change extension icon depending on whether there's a video on the page or not
// }

// function _uwbg_rcvmsg(message, sender, sendResponse){
//   if(Debug.debug){
//     console.log("[uw-bg::_uwbg_rcvmsg] received message", message, "from sender", sender);
//   }
  
//   message.sender = "uwbg";
//   message.receiver = "uw";
  
//   if(message.cmd == "has-videos"){
//     if(Debug.debug){
//       console.log("[uw-bg::_uwbg_rcvmsg] does this tab or any of its subframes have videos?", BgVars.hasVideos );
//     }
    
//     var res = {response: {hasVideos: BgVars.hasVideos}};
//     if(BrowserDetect.firefox){
//       return Promise.resolve(res);
//     }
//     sendResponse(res);
//     return true;
//   }
  
//   if(message.cmd == "get-config"){
//     var config = {};
//     config.videoAlignment = ExtensionConf.miscFullscreenSettings.videoFloat;
//     config.arConf = {};
//     config.arConf.enabled_global = ExtensionConf.arDetect.enabled == "blacklist";
    
//     config.site = {};
//     config.site.status = SitesConf.getSiteStatus(BgVars.currentSite);
//     config.site.arStatus = SitesConf.getArStatus(BgVars.currentSite);
    
//     config.mode = ExtensionConf.extensionMode;
//     config.arMode = ExtensionConf.arDetect.mode;
//     config.arDisabledReason = ExtensionConf.arDetect.disabledReason;
//     config.arTimerPlaying = ExtensionConf.arDetect.timer_playing;
    
//     if(Debug.debug)
//       console.log("[uw-bg::_uwbg_rcvmsg] Keybinds.getKeybinds() returned this:", Keybinds.getKeybinds()); 
    
//     config.keyboardShortcuts = Keybinds.getKeybinds();
    
    
//     // predvidevajmo, da je enako. Če je drugače, bomo popravili ko dobimo odgovor
//     // assume current is same as global & change that when you get response from content script
//     config.arConf.enabled_current = ExtensionConf.arDetect.enabled == "blacklist";
  
//     var res = {response: config}
    
//     if(Debug.debug){
//       console.log("[uw-bg::_uwbg_rcvmsg] get-config: returning this to popup script:", res);
//     }
    
//     if(BrowserDetect.firefox){
//       return Promise.resolve(res);
//     }
//     sendResponse(res);
//     return true;
//   }
  
//   if(message.cmd == "register-video"){
//     // dobili smo sporočilce, ki pravi: "hej jaz imam video, naredi cahen" — ampak preden naredimo cahen,
//     // se je potrebno prepričati, da je sporočilce prišlo iz pravilnega zavihka. Trenutno odprt zavihek
//     // lahko dobimo to. ID zavihka, iz katerega je prišlo sporočilo, se skriva v sender.tab.id
//     //                            ~<><\\\][=================][///><>~
//     // we got a message that says: "hey I have a video, make a mark or something" — but before we do the
//     // mark, we should check if the message has truly arrived from currently active tab. We can get the 
//     // id of currently active tab here. ID of the sender tab is ‘hidden’ in sender.tab.id.
    
//     _uwbg_registerVideo(sender.tab.id);
//   }
  
//   else if(message.cmd == "uw-enabled-for-site"){
    
//     var mode = SitesConf.getSiteStatus(BgVars.currentSite);
    
//     if(BrowserDetect.usebrowser == "firefox")
//       return Promise.resolve({response: mode});
    
//     try{
//       sendResponse({response: mode});
//     }
//     catch(chromeIsShitError){};
    
//     return true;
//   }
//   else if(message.cmd == "enable-for-site"){
//     SitesConf.updateSite(BgVars.currentSite, {status: message.option, statusEmbedded: message.option});
//   }
//   else if(message.cmd == "enable-autoar"){
//     ExtensionConf.arDetect.mode = "blacklist";
//     Settings.save(ExtensionConf);
//     Comms.sendToAll({cmd: "reload-settings", sender: "uwbg"})
//     if(Debug.debug){
//       console.log("[uw-bg] autoar set to enabled (blacklist). evidenz:", ExtensionConf);
//     }
//   }
//   else if(message.cmd == "disable-autoar"){
//     ExtensionConf.arDetect.mode = "disabled";
//     if(message.reason){
//       ExtensionConf.arDetect.disabledReason = message.reason;
//     } else {
//       ExtensionConf.arDetect.disabledReason = '';
//     }
//     Settings.save(ExtensionConf);
//     // Comms.sendToAll({cmd: "reload-settings", sender: "uwbg"});
//     if(Debug.debug){
//       console.log("[uw-bg] autoar set to disabled. evidenz:", ExtensionConf);
//     }
//   }
//   else if(message.cmd == "gib-settings"){
//     if(Debug.debug)
//       console.log("[uw-bg] we got asked for settings. Returning this:", ExtensionConf);
    
//     if(BrowserDetect.usebrowser == "firefox")
//       return Promise.resolve({response: ExtensionConf});
    
//     try{
//       sendResponse({response: ExtensionConf});
//     }
//     catch(chromeIsShitError){};
    
//     return true;
//   }
//   else if(message.cmd = "autoar-set-timer-playing"){
    
//     if(Debug.debug)
//       console.log("[uw-bg] trying to set new interval for autoAr. New interval is",message.timeout,"ms");
    
//     var timeout = message.timeout;
    
//     if(timeout < 1)
//       timeout = 1;
//     if(timeout > 999)
//       timeout = 999;
    
//     ExtensionConf.arDetect.timer_playing = timeout;
//     Settings.save(ExtensionConf);
//     Comms.sendToAll({cmd: "update-settings", sender: "uwbg", newConf: ExtensionConf});
//   }
  
// }


// main();
