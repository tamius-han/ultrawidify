// setopt, getopt, delopt. Shrani oz. dobi oz. briše stvari iz skladišča
// setopt, getopt, delopt. They set/get/delete stuff from the storage

function setopt(item){
  browser.storage.local.set(item);
}
function getopt(prop, callback){
  if(usebrowser == "chrome")
    browser.storage.local.get(prop, callback);
  else
    browser.storage.local.get(prop).then(callback);
} 
function delopt(item){
  browser.storage.local.remove(item);
}
