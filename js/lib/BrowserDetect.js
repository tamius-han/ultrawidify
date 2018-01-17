var _bd_usebrowser = "firefox";

var _bd_isFirefox = false;
var _bd_isChrome = false;
var _bd_isEdge = true;    // we'll see if FF 

try{
  // this will fail in Edge
  
  var promise = browser.runtime.getBrowserInfo();
  _bd_isFirefox = true;
  _bd_isEdge = false;
}
catch (e) {};

if(typeof browser === "undefined"){ // This is a good sign we're in chrome or chromium-based browsers
  if(chrome){
    browser = chrome;
    _bd_usebrowser = "chrome";
    _bd_isChrome = true;
    _bd_isEdge = false;
  }
}

var BrowserDetect = {
  usebrowser: _bd_usebrowser,
  firefox: _bd_isFirefox,
  chrome: _bd_isChrome,
  edge: _bd_isEdge
}
