function gibActiveTab(){
  return browser.tabs.query({active: true, currentWindow: true});
}

function notifyChange(){
  return browser.tabs.query({active: true, currentWindow: true}, function(tabs){
    browser.tabs.sendMessage(tabs[0].id, {message: "page-change"});
  });
}



browser.tabs.onUpdated.addListener(notifyChange);

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("content script gibed: ", request.test);
});


