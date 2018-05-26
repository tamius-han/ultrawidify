class CommsClient {
  constructor(name){
    this.port = browser.runtime.connect({name: name});

    var ths = this;
    this.port.onMessage.addListener(m => ths.processReceivedMessage(m));
    this.hasSettings = false;
  }
  
  setPageInfo(pageInfo){
    this.pageInfo = pageInfo;
  }

  processReceivedMessage(message){
    if(Debug.debug && Debug.comms){
      console.log("[CommsClient.js::processMessage] Received message from background script!", message);
    }

    if(message.cmd === "set-ar"){
      this.pageInfo.setAr(message.ar);
    } else if (message.cmd === "has-videos") {
      
    } else if (message.cmd === "set-config") {
      this.hasSettings = true;
      ExtensionConf = message.conf;
    } else if (message.cmd === "set-stretch") {

    } else if (message.cmd === "autoar-enable") {
      if (message.enabled !== false) {
        this.pageInfo.initArDetection();
        this.pageInfo.startArDetection();
      } else {
        this.pageInfo.stopArDetection();
      }
    } else if (message.cmd === "pause-processing") {
      this.pageInfo.pauseProcessing();
    } else if (message.cmd === "resume-processing") {
      // todo: autoArStatus
      this.pageInfo.resumeProcessing(message.autoArStatus);
    }
  }

  async waitForSettings(){
    var t = this;
    return new Promise( async (resolve, reject) => {
      while(true){
        await t.sleep(100);
        if(this.hasSettings){
          resolve();
          break;
        }
      }
    });
  }

  async sleep(n){
    return new Promise( (resolve, reject) => setTimeout(resolve, n) );
  }

  async sendMessage_nonpersistent(message){
    if(BrowserDetect.firefox){
      return browser.runtime.sendMessage(message)
    } else {
      return new Promise((resolve, reject) => {
        try{
          if(BrowserDetect.edge){
            browser.runtime.sendMessage(message, function(response){
              var r = response; 
              resolve(r);
            });
          } else {
            chrome.runtime.sendMessage(message, function(response){
              // Chrome/js shittiness mitigation — remove this line and an empty array will be returned
              var r = response; 
              resolve(r);
            });
          }
        }
        catch(e){
          reject(e);
        }
      });
    }
  }

  async requestSettings(){
    if(Debug.debug){
      console.log("%c[CommsClient::requestSettings] sending request for congif!", "background: #11D; color: #DDA");
    }
    var response = await this.sendMessage_nonpersistent({cmd: 'get-config'});
    if(Debug.debug){
      console.log("%c[CommsClient::requestSettings] received settings response!", "background: #11D; color: #DDA", response);
    }

    if(! response || response.extensionConf){
      return Promise.resolve(false);
    }

    ExtensionConf = JSON.parse(response.extensionConf);
    return Promise.resolve(true);
  }

  async requestSettings_fallback(){
    this.port.postMessage({cmd: "get-config"});
  }

  registerVideo(){
    this.port.postMessage({cmd: "has-video"});
  }

  unregisterVideo(){
    this.port.postMessage({cmd: "noVideo"});  // ayymd
  }
}

class CommsServer {
  constructor(server) {
    this.server = server;
    this.ports = [];

    var ths = this;


    if (BrowserDetect.firefox) {
      browser.runtime.onConnect.addListener(p => ths.onConnect(p));
      browser.runtime.onMessage.addListener(m => ths.processReceivedMessage_nonpersistent_ff(m));
    } else {
      chrome.runtime.onConnect.addListener(p => ths.onConnect(p));
      chrome.runtime.onMessage.addListener((msg, sender, callback) => ths.processReceivedMessage_nonpersistent_chrome(m, sender, callback));
    }
  }

  sendToAll(message){
    for(p of this.ports){
      for(frame in p){
        p[frame].postMessage(message);
      }
    }
  }

  sendToActive(message) {
    if(BrowserDetect.firefox){
      this._sendToActive_ff(message);
    } else if (BrowserDetect.chrome) {

    }
  }

  async _sendToActive_ff(message){ 
    var activeTab = await browser.tabs.query({currentWindow: true, active: true});
    for (key in this.ports[tabs[0].id]) {
      this.ports[tabs[0].id][key].postMessage(message);
    }
  }


  async queryTabs_chrome(tabInfo){
    return new Promise(function (resolve, reject){    
      browser.tabs.query(tabInfo, function(response){
        browser.tabs.query(tabInfo);
        // Chrome/js shittiness mitigation — remove this line and an empty array will be returned
        var r = response; 
        resolve(r);
      });
    });
  }

  onConnect(port){
    console.log("on connect!", port.sender.tab.id, port)
    var tabId = port.sender.tab.id;
    var frameId = port.sender.frameId;
    var ths = this;
    if(! this.ports[tabId]){
      this.ports[tabId] = {}; 
    }
    this.ports[tabId][frameId] = port;
    this.ports[tabId][frameId].onMessage.addListener( (m,p) => ths.processReceivedMessage(m, p));
    this.ports[tabId][frameId].onDisconnect.addListener( (p) => { 
      delete ths.ports[p.sender.tab.id][p.sender.frameId]; 
      if(Object.keys(ths.ports[p.sender.tab.id]).length === 0){
        ths.ports[tabId] = undefined;
      }
    });
  }

  processReceivedMessage(message, port){
    if (Debug.debug && Debug.comms) {
      console.log("[CommsServer.js::processMessage] Received message from background script!", message, "port", port);
    }

    if (message.cmd === 'get-config') {
      port.postMessage({cmd: "set-config", conf: ExtensionConf})
    }
  }

  processReceivedMessage_nonpersistent_ff(message, sender){
    if (Debug.debug && Debug.comms) {
      console.log("%c[CommsServer.js::processMessage_nonpersistent_ff] Received message from background script!", "background-color: #11D; color: #DDA", message, sender);
    }

    if (message.cmd === 'get-config') {
      var ret = {extensionConf: JSON.stringify(ExtensionConf)};
      if (Debug.debug && Debug.comms) {
        console.log("%c[CommsServer.js::processMessage_nonpersistent_ff] Returning this:", "background-color: #11D; color: #DDA", ret);
      }
      Promise.resolve(ret);
    }
    if (message.cmd === "enable-autoar"){
      this.sendToActive({cmd: "autoar-enable", enabled: true})
    }
  }

  processReceivedMessage_nonpersistent_chrome(message, sender, sendResponse){
    if (Debug.debug && Debug.comms) {
      console.log("[CommsServer.js::processMessage_nonpersistent_chrome] Received message from background script!", message);
    }

    if(message.cmd === 'get-config') {
      sendResponse({extensionConf: JSON.stringify(ExtensionConf)});
      // return true;
    }
  }
}

var _com_chrome_tabquery_wrapper = async function(tabInfo){
  
}


var _com_queryTabs = async function(tabInfo){
  if(BrowserDetect.usebrowser != "firefox"){
    return await _com_chrome_tabquery_wrapper(tabInfo);
  }
  else{
    return browser.tabs.query(tabInfo);
  }
}

var _com_getActiveTab = async function(tabInfo){
  if(BrowserDetect.firefox){
    return await browser.tabs.query({currentWindow: true, active: true});
  }
  return _com_chrome_tabquery_wrapper({currentWindow: true, active: true});
}


var _com_chrome_tabs_sendmsg_wrapper = async function(tab, message, options){
  return new Promise(function (resolve, reject){
    try{
      browser.tabs.sendMessage(tab, message, /*options, */function(response){
        console.log("TESTING what is this owo? (response)", response);
        
        // Chrome/js shittiness mitigation — remove this line and an empty array will be returned
        var r = response; 
        
        resolve(r);
      });
    }
    catch(e){
      reject(e);
    }
  });
}

var _com_sendMessage = async function(tab, message, options){
  if(BrowserDetect.usebrowser != "firefox"){
    var r = await _com_chrome_tabs_sendmsg_wrapper(tab, message, options);
    console.log("TESTING what is this owo? (should be a promise)", r);
    return r;
  }
  else{
    return browser.tabs.sendMessage(tab, message, options);
  }
}

var _com_chrome_tabs_sendmsgrt_wrapper = async function(message){
  return new Promise(function (resolve, reject){
    try{
      browser.runtime.sendMessage(message, function(response){
        
        // Chrome/js shittiness mitigation — remove this line and an empty array will be returned
        var r = response; 
        
        resolve(r);
      });
    }
    catch(e){
      reject(e);
    }
  });
}

var _com_sendMessageRuntime = async function(message){
  if(BrowserDetect.usebrowser != "firefox"){
    return _com_chrome_tabs_sendmsgrt_wrapper(message);
  }
  else{
    return browser.runtime.sendMessage(message);
  }
}

// pošlje sporočilce vsem okvirjem v trenutno odprtem zavihku. Vrne tisti odgovor od tistega okvira, ki prispe prvi.
// sends a message to all frames in the currently opened tab. Returns the response of a frame that replied first
var _com_sendToAllFrames = async function(message) {
  if(Debug.debug)
    console.log("[Comms::_com_sendToAllFrames] sending message to all frames of currenntly active tab");
  
  var tabs = await browser.tabs.query({currentWindow: true, active: true}); 
  
  if(Debug.debug)
    console.log("[Comms::_com_sendToAllFrames] trying to send message", message, " to tab ", tabs[0], ". (all tabs:", tabs,")");
  
  var response = await browser.tabs.sendMessage(tabs[0].id, message);
  console.log("[Comms::_com_sendToAllFrames] response is this:",response);
  return response;
  
//   if(BrowserDetect.firefox){
//     return 
//   }
}

// pošlje sporočilce vsem okvirjem v trenutno odprtem zavihku in vrne _vse_ odgovore
// sends a message to all frames in currently opened tab and returns all responses
var _com_sendToEachFrame = async function(message, tabId) {
  if(Debug.debug)
    console.log("[Comms::_com_sendToEveryFrame] sending message to every frames of currenntly active tab");
  
  if(tabId === undefined){
    var tabs = await browser.tabs.query({currentWindow: true, active: true});
    tabId = tabs[0].id;
  }
  var frames = await browser.webNavigation.getAllFrames({tabId: tabId});
  
  if(Debug.debug)
    console.log("[Comms::_com_sendToEveryFrame] we have this many frames:", frames.length, "||| tabId:", tabId ,"frames:",frames);
  
  
  // pošlji sporočilce vsakemu okvirju, potisni obljubo v tabelo
  // send message to every frame, push promise to array
  var promises = [];
  for(var frame of frames){
      if(Debug.debug)
        console.log("[Comms:_com_sendToEachFrame] we sending message to tab with id", tabId, ", frame with id", frame.frameId);
      try{
        promises.push(browser.tabs.sendMessage(tabId, message, {frameId: frame.frameId}));
      }
      catch(e){
        if(Debug.debug)
          console.log("[Comms:_com_sendToEachFrame] we sending message to tab with id", tabId, ", frame with id", frame.frameId);
      }
  }
  
  // počakajmo, da so obljube izpolnjene. 
  // wait for all promises to be kept
  
  var responses = [];
  
  for(var promise of promises){
    var response = await promise;
    if(response !== undefined)
      responses.push(response);
  }
  
  if(Debug.debug)
    console.log("[Comms::_com_sendToEveryFrame] we received responses from all frames", responses);
  
  return responses;
}

var _com_sendToMainFrame = async function(message, tabId){
  if(Debug.debug)
    console.log("[Comms::_com_sendToMainFrame] sending message to every frames of currenntly active tab");
  
  if(tabId === undefined){
    var tabs = await browser.tabs.query({currentWindow: true, active: true});
    tabId = tabs[0].id;
  }
  
  // pošlji sporočilce glavnemu okvirju. Glavni okvir ima id=0
  // send message to the main frame. Main frame has id=0
  try{
    var response = await browser.tabs.sendMessage(tabId, message, {frameId: 0});
    console.log("[Comms::_com_sendToMainFrame] response is this:",response);
    
  }
  catch(e){
      console.log("[Comms:_com_sendToEachFrame] failed sending message to tab with id", tabId, ", frame with id", 0, "\nerror:",e);
  }
  return response;
}

// var Comms = {
//   getActiveTab: _com_getActiveTab,
//   sendToBackgroundScript: _com_sendMessageRuntime,
//   queryTabs: _com_queryTabs,
//   sendMessage: _com_sendMessage,
//   sendMessageRuntime: _com_sendMessageRuntime,
//   sendToEach: _com_sendToEachFrame,
//   sendToAll: _com_sendToAllFrames,
//   sendToMain: _com_sendToMainFrame,
// }
