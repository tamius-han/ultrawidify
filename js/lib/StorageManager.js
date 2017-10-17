// setopt, getopt, delopt. Shrani oz. dobi oz. briše stvari iz skladišča
// setopt, getopt, delopt. They set/get/delete stuff from the storage

var _sm_setopt = function(item){
  browser.storage.local.set(item);
}
var _sm_getopt = function(prop, callback){
  if(BrowserDetect.usebrowser == "chrome")
    browser.storage.local.get(prop, callback);
  else
    browser.storage.local.get(prop).then(callback);
} 
var _sm_delopt = function(item){
  browser.storage.local.remove(item);
}

var StorageManager = {
  setopt: _sm_setopt,
  getopt: _sm_getopt,
  delopt: _sm_delopt
}
