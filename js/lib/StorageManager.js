// setopt, getopt, delopt. Shrani oz. dobi oz. briše stvari iz skladišča
// setopt, getopt, delopt. They set/get/delete stuff from the storage

var _sm_setopt = function(item){
  return browser.storage.local.set(item);
}
var _sm_getopt = function(prop, callback){
  if(BrowserDetect.usebrowser == "chrome")
    return browser.storage.local.get(prop, callback);
  else
    return browser.storage.local.get(prop).then(callback);
}

var _sm_chrome_getopt_wrapper = async function(prop){
  return new Promise(function (resolve, reject){
    browser.storage.local.get(prop, function(response){
      resolve(response);
    });
  });
}


var _sm_getopt_async = async function(prop){
  if(Debug.debug && Debug.debugStorage)
    console.log("[StorageManager::_sm_getopt_async] requesting prop",prop,"from localStorage.");
 
  if(BrowserDetect.usebrowser == "chrome"){
    var ret = await _sm_chrome_getopt_wrapper(prop);
    return ret;
  }
  else{
    var ret = await browser.storage.local.get(prop);
    
    if(Debug.debug && Debug.debugStorage)
      console.log("[StorageManager::_sm_getopt_async] got prop", prop, "; value: ", ret);
    
    return ret;
  }
}

var _sm_delopt = function(item){
  return browser.storage.local.remove(item);
}

var StorageManager = {
  setopt: _sm_setopt,
  getopt: _sm_getopt,
  delopt: _sm_delopt,
  getopt_async: _sm_getopt_async
}
