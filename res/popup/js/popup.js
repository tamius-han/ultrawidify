if(Debug.debug)
  console.log("[popup.js] loading popup script!");

document.getElementById("uw-version").textContent = browser.runtime.getManifest().version;

var Menu = {};
// Menu.noVideo    = document.getElementById("no-videos-display");
Menu.general    = document.getElementById("extension-mode");
Menu.thisSite   = document.getElementById("settings-for-current-site");
Menu.arSettings = document.getElementById("aspect-ratio-settings");
Menu.cssHacks   = document.getElementById("css-hacks-settings");
Menu.about      = document.getElementById("panel-about");

var MenuTab = {};
MenuTab.general    = document.getElementById("_menu_general");
MenuTab.thisSite   = document.getElementById("_menu_this_site");
MenuTab.arSettings = document.getElementById("_menu_aspectratio");
MenuTab.cssHacks   = document.getElementById("_menu_hacks");
MenuTab.about      = document.getElementById("_menu_about");

var ArPanel = {}
ArPanel.alignment = {};
ArPanel.alignment.left   = document.getElementById("_align_left");
ArPanel.alignment.center = document.getElementById("_align_center");
ArPanel.alignment.right  = document.getElementById("_align_right");
ArPanel.autoar = {};
ArPanel.autoar.enable      = document.getElementById("_autoar_enable");
ArPanel.autoar.disable     = document.getElementById("_autoar_disable");
ArPanel.autoar.enable_tmp  = document.getElementById("_autoar_enable_tmp");
ArPanel.autoar.disable_tmp = document.getElementById("_autoar_disable_tmp");


var selectedMenu = "arSettings";
var hasVideos = false;

var _config; 
var _changeAr_button_shortcuts = { "autoar":"none", "reset":"none", "219":"none", "189":"none", "169":"none" }


// async function test(){
//   var message = {cmd: "testing"};
//   try{
//     var tabs = await Comms.queryTabs({currentWindow: true, active: true}); 
//     if(Debug.debug)
//       console.log("[popup.js::test] trying to send message", message, " to tab ", tabs[0], ". (all tabs:", tabs,")");
// 
//     var response = await browser.tabs.sendMessage(tabs[0].id, message);
//     console.log("[popup.js::test] response is this:",response);
//   }
//   catch(e){
//     console.log("[popup.js::test] sending message failed. prolly cos browser.tabs no worky?", e); 
//   }
// }
// test();



async function sendMessage(message){
  console.log("SENDING MESSAGE TO CONTENT SCRIPT");
  var tabs = await browser.tabs.query({currentWindow: true, active: true}); 
  if(Debug.debug)
    console.log("[uw-bg::sendMessage] trying to send message", message, " to tab ", tabs[0], ". (all tabs:", tabs,")");
  
  var response = await browser.tabs.sendMessage(tabs[0].id, message);
  console.log("[uw-bg::sendMessage] response is this:",response);
  return response;
}

function hideWarning(warn){
  document.getElementById(warn).classList.add("hidden");
}

function check4videos(){

  Comms.sendToBackgroundScript({cmd: "has-videos"})
  .then(response => {
    if(Debug.debug){
      console.log("[popup.js::check4videos] received response:",response, "has video?", response.response.hasVideos);
    }
    if(response.response.hasVideos){
      hasVideos = true;
//       openMenu(selectedMenu);
      hideWarning("no-videos-warning");
    }
    else{
      // brute force error mitigation.
      setTimeout(check4videos, 2000);
    }
  })
  .catch(error => {
    if(Debug.debug)
      console.log("%c[popup.js::check4videos] sending message failed with error", "color: #f00", error, "%c retrying in 1s ...", "color: #f00");
    
    setTimeout(check4videos, 1000);
  });
}

function check4conf(){
  
  Comms.sendToBackgroundScript({cmd: "get-config"})
  .then(response => {
    if(Debug.debug)
      console.log("[popup.js::check4conf] received response:",response, response.response);
    
    loadConfig(response.response);
  })
  .catch(error => {
    if(Debug.debug)
      console.log("%c[popup.js::check4conf] sending message failed with error", "color: #f00", error, "%c retrying in 1s ...", "color: #f00");
    
    setTimeout(check4conf, 1000);
  });
}

function check4siteStatus(){
  Comms.sendToBackgroundScript({cmd: "uw-enabled-for-site"})
  .then(response => {
    if(Debug.debug)
      console.log("[popup::check4siteStatus] received response:", response);
    
    document.extensionEnabledOnCurrentSite.mode.value = response.response;
  })
  .catch(error => {
    if(Debug.debug)
      console.log("%c[popup.js::check4siteStatus] sending message failed with error", "color: #f00", error, "%c retrying in 1s ...", "color: #f00");
    
//     setTimeout(check4siteStatus, 1000);
  });
}

function stringToKeyCombo(key_in){
  var keys_in = key_in.split("_");
  var keys_out = "";
  
  for(key of keys_in){
    if(key == "ctrlKey")
      keys_out += "ctrl + ";
    else if(key == "shiftKey")
      keys_out += "shift + ";
    else if(key == "altKey")
      keys_out += "alt + ";
    else
      keys_out += key;
  }
  
  return keys_out;
}

function loadConfig(config){
  if(Debug.debug)
    console.log("[popup.js::loadConfig] loading config. conf object:",config);
    
  _config = config;
  
  // process video alignment:
  if(config.videoAlignment){
    for(var button in ArPanel.alignment)
      ArPanel.alignment[button].classList.remove("selected");
    
    ArPanel.alignment[config.videoAlignment].classList.add("selected");
  }
  
  // process keyboard shortcuts:
  if(config.keyboardShortcuts){
    for(var key in config.keyboardShortcuts){
      var shortcut = config.keyboardShortcuts[key];
      var keypress = stringToKeyCombo(key);
      
      
      try{
        if(shortcut.action == "char"){
          if(shortcut.targetAr == 2.0){
            _changeAr_button_shortcuts["189"] = keypress;
          }
          else if(shortcut.targetAr == 2.39){
            _changeAr_button_shortcuts["219"] = keypress;
          }
          else if(shortcut.targetAr == 1.78){
            _changeAr_button_shortcuts["169"] = keypress;
          }
        }
        else{
            _changeAr_button_shortcuts[shortcut.action] = keypress;
        }
      }
      catch(Ex){
        //do nothing if key doesn't exist
      }
    }
    for(var key in _changeAr_button_shortcuts){
      try{
        document.getElementById("_b_changeAr_" + key + "_key").textContent = "(" + _changeAr_button_shortcuts[key] + ")";
      }
      catch(ex){
        
      }
    }
  }
  
  
  // process aspect ratio settings
  showArctlButtons();
}


function openMenu(menu){
  if(Debug.debug){
    console.log("[popup.js::openMenu] trying to open menu", menu, "| element: ", Menu[menu]);
  }
  
  for(var m in Menu){
    Menu[m].classList.add("hidden");
  }
  for(var m in MenuTab){
    if(MenuTab[m])
      MenuTab[m].classList.remove("selected");
  }
  
  if(menu == "arSettings" || menu == "cssHacks" ){
//     if(!hasVideos)
//       Menu.noVideo.classList.remove("hidden");
//     else{
      Menu[menu].classList.remove("hidden");
      if(Debug.debug){
        console.log("[popup.js::openMenu] unhid", menu, "| element: ", Menu[menu]);
//       }
    }
  }
  else{
    Menu[menu].classList.remove("hidden");
    if(Debug.debug){
      console.log("[popup.js::openMenu] unhid", menu, "| element: ", Menu[menu]);
    }
  }
  
  selectedMenu = menu;
  MenuTab[menu].classList.add("selected");
}

function _arctl_onclick(command){
  if(! _config)
    return;
  
  if(command.cmd == "stop-autoar")
    _config.arConf.enabled_current = false;
  else if(command.cmd == "force-ar")
    _config.arConf.enabled_current = true;
  else if(command.cmd == "disable-autoar")
    _config.arConf.enabled_global = false;
  else if(command.cmd == "enable-autoar")
    _config.arConf.enabled_global = true;
  
  showArctlButtons();
}

function showArctlButtons(){
  if(! _config)
    return;
  
//   if(_config.arConf){
//     if(! _config.arConf.enabled_global){
//       ArPanel.autoar.disable.classList.add("hidden");
//       ArPanel.autoar.enable.classList.remove("hidden");
//       
//       ArPanel.autoar.enable_tmp.textContent = "Temporarily enable";
//       ArPanel.autoar.disable_tmp.textContent = "Temporarily disable";
//     }
//     else{
//       ArPanel.autoar.disable.classList.remove("hidden");
//       ArPanel.autoar.enable.classList.add("hidden");
//       
//       ArPanel.autoar.enable_tmp.textContent = "Re-enable";
//       ArPanel.autoar.disable_tmp.textContent = "Temporarily disable";
//     }
//     if(! _config.arConf.enabled_current){
//       ArPanel.autoar.disable_tmp.classList.add("hidden");
//       ArPanel.autoar.enable_tmp.classList.remove("hidden");
//     }
//     else{
//       ArPanel.autoar.disable_tmp.classList.remove("hidden");
//       ArPanel.autoar.enable_tmp.classList.add("hidden");
//     }
//   }
}

function toggleSite(option){
  if(Debug.debug)
    console.log("[popup::toggleSite] toggling extension 'should I work' status to", option, "on current site");
  
  Comms.sendToBackgroundScript({cmd:"enable-for-site", option:option});
}

document.addEventListener("click", (e) => {
  
  
  function getcmd(e){
    
    var command = {};
    command.sender = "popup";
    command.receiver = "uwbg";
    
    if(e.target.classList.contains("disabled"))
      return;
    
    if(e.target.classList.contains("menu-item")){
      if(e.target.classList.contains("_menu_general")){
        openMenu("general");
      }
      if(e.target.classList.contains("_menu_this_site")){
        openMenu("thisSite");
      }
      else if(e.target.classList.contains("_menu_aspectratio")){
        openMenu("arSettings");
      }
      else if(e.target.classList.contains("_menu_hacks")){
        openMenu("cssHacks");
      }
      else if(e.target.classList.contains("_menu_about")){
        openMenu("about");
      }
      
      // don't send commands
      return;
    }
    
    if(e.target.classList.contains("_changeAr")){
      if(e.target.classList.contains("_ar_auto")){
        command.cmd = "force-ar";
        command.newAr = "auto";
        command.arType = "legacy";
        return command;
      }
      if(e.target.classList.contains("_ar_reset")){
        command.cmd = "force-ar";
        command.newAr = "reset";
        command.arType = "legacy";
        return command;
      }
      if(e.target.classList.contains("_ar_fitw")){
        command.cmd = "force-ar";
        command.newAr = "fitw";
        command.arType = "legacy";
        return command;
      }
      if(e.target.classList.contains("_ar_fitw")){
        command.cmd = "force-ar";
        command.newAr = "fith";
        command.arType = "legacy";
        return command;
      }
      if(e.target.classList.contains("_ar_219")){
        command.cmd = "force-ar";
        command.newAr = 2.39;
        command.arType = "static";
        return command;
      }
      if(e.target.classList.contains("_ar_189")){
        command.cmd = "force-ar";
        command.newAr = 2.0;
        command.arType = "static";
        return command;
      }
      if(e.target.classList.contains("_ar_169")){
        command.cmd = "force-ar";
        command.newAr = 1.78;
        command.arType = "static";
        return command;
      }
      if(e.target.classList.contains("_ar_1610")){
        command.cmd = "force-ar";
        command.newAr = 1.6;
        command.arType = "static";
        return command;
      }
    }
    
    if(e.target.classList.contains("_autoar")){
      var command = {};
      if(e.target.classList.contains("_autoar_temp-disable")){
        command = {cmd: "stop-autoar", sender: "popup", receiver: "uwbg"};
      }
      else if(e.target.classList.contains("_autoar_disable")){
        command = {cmd: "disable-autoar", sender: "popup", receiver: "uwbg"};
      }
      else if(e.target.classList.contains("_autoar_enable")){
        command = {cmd: "enable-autoar", sender: "popup", receiver: "uwbg"};
      }
      else{
        command = {cmd: "force-ar", newAr: "auto", sender: "popup", receiver: "uwbg"};
      }
      _arctl_onclick(command);
      return command;
    }
    
    if(e.target.classList.contains("_align")){
      
      command.global = true;
      
      if(e.target.classList.contains("_align_left")){
        command.cmd = "force-video-float",
        command.newFloat = "left"
        
        console.log(".................\n\n\n..........\n\n              >>command<< \n\n\n\n            ",command,"\n\n\n.........\n\n\n................................");
        
        return command;
      }
      if(e.target.classList.contains("_align_center")){
        command.cmd = "force-video-float"
        command.newFloat = "center"
        return command;
      }
      if(e.target.classList.contains("_align_right")){
        command.cmd = "force-video-float";
        command.newFloat = "right";
        return command;
      }
    }
  
    if(e.target.classList.contains("extensionEnabledOnCurrentSite")){
      toggleSite(document.extensionEnabledOnCurrentSite.mode.value);
    }
    
  }
  
  var command = getcmd(e);  
  if(command)
    Comms.sendToAll(command);
  
  return true;
});

hideWarning("script-not-running-warning");
openMenu(selectedMenu);
check4videos();
check4conf();
check4siteStatus();
