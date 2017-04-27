// setopt in getopt. Shranita oz. dobita stvari iz skladišča
// setopt, getopt. They set/get stuff from the storage

function setopt(item){
  browser.storage.local.set(item);
}
function getopt(prop, callback){
  if(usebrowser == "chrome")
    browser.storage.local.get(prop, callback);
  else
    browser.storage.local.get(prop).then(callback);
} 
