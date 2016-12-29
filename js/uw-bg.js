debugmsg = false;
url_changed = false;


/********************************************
 ****  script-related stuff starts here  ****
 ********************************************/

function gibActiveTab(){
  return browser.tabs.query({active: true, currentWindow: true});
}

function notifyChange(){
  
  if(debugmsg)
    console.log("uw-bg::tab updated. Did we mark for update?", url_changed);
  
  if(url_changed)   //we've already set the proverbial fuse, no need to trigger the function multiple times
    return;
  
  url_changed = true;  // We mark that the page was changed. We wait for a while before triggering changes.
  
  setTimeout(function() { 
    console.log("uw-bg::sending a message");
    browser.tabs.query({active: true, currentWindow: true}, function(tabs){
      browser.tabs.sendMessage(tabs[0].id, {message: "page-change"});
    });
    setTimeout(function(){url_changed = false;}, 100);
  }, 3000);
}



browser.tabs.onUpdated.addListener(notifyChange);

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if(debugmsg)
    console.log("content script gibed: ", request.test);
});


