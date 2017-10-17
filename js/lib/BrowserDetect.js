var _bd_usebrowser = "firefox";

if(typeof browser === "undefined"){ // This means we're probably not on Firefox.
  if(chrome){
    browser = chrome;
    _bd_usebrowser = "chrome";
  }
}

var BrowserDetect = {
  usebrowser: _bd_usebrowser
}
