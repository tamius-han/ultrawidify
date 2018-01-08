var _com_chrome_tabquery_wrapper = async function(tabInfo){
  return new Promise(function (resolve, reject){    
    browser.tabs.query(tabInfo, function(response){
      
      // Chrome/js shittiness mitigation — remove this line and an empty array will be returned
      var r = response; 
      resolve(r);
    });
  });
}


var _com_queryTabs = async function(tabInfo){
  if(BrowserDetect.usebrowser == "chrome"){
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
  if(BrowserDetect.usebrowser == "chrome"){
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
  if(BrowserDetect.usebrowser == "chrome"){
    return _com_chrome_tabs_sendmsgrt_wrapper(message);
  }
  else{
    return browser.runtime.sendMessage(message);
  }
}

var Comms = {
  queryTabs: _com_queryTabs,
  sendMessage: _com_sendMessage,
  sendMessageRuntime: _com_sendMessageRuntime
}
