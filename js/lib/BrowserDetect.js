var _bd_usebrowser = "firefox";

var _bd_isFirefox = false;
var _bd_isChrome = false;
var _bd_isEdge = false;    // we'll see if FF 

try{
  // todo: find something that works in firefox but not in edge (or vice-versa)  
  var browserinfo = browser.runtime.getBrowserInfo();

  // we don't need to actually check because only firefox supports that. 
  // if we're not on firefox, the above call will probably throw an exception anyway.
  // if browsers other than firefox start supporting that, well ... we'll also need to actually await for promise
  // that getBrowserInfo() returns to resolve.

  // if (Browser.name.toLowerCase().indexOf(firefox) !== -1 || Browser.vendor.toLowerCase().indexOf(mozilla) !== -1) {
    _bd_isFirefox = true;
    _bd_isEdge = false;
  // }

}
catch (e) {
  if(Debug.debug) {
    console.info("[BrowserDetect] browser.runtime.getBrowserInfo() probably failed. This means we're probably not using firefox.", e)
  }
};

if(typeof browser === "undefined"){ // This is a good sign we're in chrome or chromium-based browsers
  if(chrome){
    browser = chrome;
    _bd_usebrowser = "chrome";
    _bd_isChrome = true;
    _bd_isEdge = false;
    _bd_isFirefox = false;
  }
}

var BrowserDetect = {
  usebrowser: _bd_usebrowser,
  firefox: _bd_isFirefox,
  chrome: _bd_isChrome,
  edge: _bd_isEdge
}

if(Debug.debug){
  console.log("BrowserDetect loaded! Here's BrowserDetect object:", BrowserDetect)
}