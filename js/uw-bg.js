debugmsg = true;
url_changed = false;


/********************************************
 ****  script-related stuff starts here  ****
 ********************************************/

function gibActiveTab(){
  return browser.tabs.query({active: true, currentWindow: true});
}

var page_change_msg_count = 0;

function notifyChange(){
  
  if(debugmsg)
    console.log("uw-bg::tab updated. seq:", page_change_msg_count++);
  
  browser.tabs.query({active: true, currentWindow: true}, function(tabs){
    browser.tabs.sendMessage(tabs[0].id, {message: "page-change"});
  });
}




browser.tabs.onUpdated.addListener(notifyChange);

browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if(debugmsg)
    console.log("content script gibed: ", request.test);
});


