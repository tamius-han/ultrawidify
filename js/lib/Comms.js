var _com_chrome_tabquery_wrapper = async function(tabInfo){
  return new Promise(function (resolve, reject){    
    browser.tabs.query(tabInfo, function(response){
      browser.tabs.query(tabInfo);
      // Chrome/js shittiness mitigation — remove this line and an empty array will be returned
      var r = response; 
      resolve(r);
    });
  });
}


var _com_queryTabs = async function(tabInfo){
  if(BrowserDetect.usebrowser != "firefox"){
    return await _com_chrome_tabquery_wrapper(tabInfo);
  }
  else{
    return browser.tabs.query(tabInfo);
  }
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
var _com_sendToEachFrame = async function(message) {
  if(Debug.debug)
    console.log("[Comms::_com_sendToEveryFrame] sending message to every frames of currenntly active tab");
  
  try{
    var tabs = await browser.tabs.query({currentWindow: true, active: true}); 
    var frames = await browser.webNavigation.getAllFrames({tabId: tabs[0].id});
  
    if(Debug.debug)
      console.log("[Comms::_com_sendToEveryFrame] we have this many frames:", frames.length, "||| tabs:",tabs,"frames:",frames);
    
    
    // pošlji sporočilce vsakemu okvirju, potisni obljubo v tabelo
    // send message to every frame, push promise to array
    var promises = [];
    for(var frame in frames){
      promises.push(browser.tabs.sendMessage(tabs[0].id, message, {frameId: frame.frameId}));
    }
    
    // počakajmo, da so obljube izpolnjene. 
    // wait for all promises to be kept
    var responses = await Promise.all(promises);
    
    if(Debug.debug)
      console.log("[Comms::_com_sendToEveryFrame] we received responses from all frames", responses);
    
    return responses;
  }
  catch(e){
    console.log("[Comms::_com_sendToEveryFrame] something went wrong when getting frames. this is error:", e);
    return Promise.reject();
  }
}

var Comms = {
  queryTabs: _com_queryTabs,
  sendMessage: _com_sendMessage,
  sendMessageRuntime: _com_sendMessageRuntime,
  sendToEach: _com_sendToEachFrame,
  sendToAll: _com_sendToAllFrames,
}
