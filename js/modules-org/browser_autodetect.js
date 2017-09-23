var browser_autodetect = true;
usebrowser = "firefox";

if(typeof browser === "undefined"){ // This means we're probably not on Firefox.
  if(chrome){
    browser = chrome;
    usebrowser = "chrome";
  }
}
else{
  usebrowser = "firefox"; 
}
