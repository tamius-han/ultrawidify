if(Debug.debug)
  console.log("[popup.js] loading popup script!");

document.getElementById("uw-version").textContent = browser.runtime.getManifest().version;

var Menu = {};
// Menu.noVideo    = document.getElementById("no-videos-display");
Menu.general    = document.getElementById("extension-mode");
Menu.thisSite   = document.getElementById("settings-for-current-site");
Menu.arSettings = document.getElementById("aspect-ratio-settings");
Menu.autoAr     = document.getElementById("autoar-basic-settings");
Menu.cssHacks   = document.getElementById("css-hacks-settings");
Menu.about      = document.getElementById("panel-about");

var MenuTab = {};
MenuTab.general    = document.getElementById("_menu_general");
MenuTab.thisSite   = document.getElementById("_menu_this_site");
MenuTab.arSettings = document.getElementById("_menu_aspectratio");
MenuTab.cssHacks   = document.getElementById("_menu_hacks");
MenuTab.about      = document.getElementById("_menu_about");
MenuTab.autoAr     = document.getElementById("_menu_autoar");

var ExtPanel = {};
ExtPanel.siteOptions = {};
ExtPanel.siteOptions.disabled = document.getElementById("_ext_site_options_blacklist");
ExtPanel.siteOptions.enabled  = document.getElementById("_ext_site_options_whitelist");
ExtPanel.siteOptions.default  = document.getElementById("_ext_site_options_default");

var AutoArPanel = {};
AutoArPanel.siteOptions = {};
AutoArPanel.siteOptions.disabled = document.getElementById("_ext_site_options_blacklist");
AutoArPanel.siteOptions.enabled  = document.getElementById("_ext_site_options_whitelist");
AutoArPanel.siteOptions.default  = document.getElementById("_ext_site_options_default");

var ArPanel = {};
ArPanel.alignment = {};
ArPanel.alignment.left   = document.getElementById("_align_left");
ArPanel.alignment.center = document.getElementById("_align_center");
ArPanel.alignment.right  = document.getElementById("_align_right");
ArPanel.autoar = {};


var selectedMenu = "arSettings";
var hasVideos = false;

var _config; 
var _changeAr_button_shortcuts = { "autoar":"none", "reset":"none", "219":"none", "189":"none", "169":"none" }

var comms = new Comms();
var port = browser.runtime.connect({name: 'popup-port'});
port.onMessage.addListener( (m,p) => processReceivedMessage(m,p));

async function processReceivedMessage(message, port){
  if(message.cmd === 'set-config'){
    this.loadConfig(message.conf, message.site);
  }
}

function hideWarning(warn){
  document.getElementById(warn).classList.add("hidden");
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

function loadConfig(extensionConf, site){
  if(Debug.debug)
    console.log("[popup.js::loadConfig] loading config. conf object:", extensionConf, "\n\n\n\n\n\n\n\n-------------------------------------");
    
  _extensionConf = extensionConf;

  // ----------------------
  //#region extension-basics - SET BASIC EXTENSION OPTIONS
  if(Debug.debug)
    console.log("Extension mode?", extensionConf.extensionMode, "| site & site options:", site, ",", (site && extensionConf.sites[site]) ? extensionConf.sites[site].status : "fucky wucky?");
  document.getElementById("_checkbox_ext-enabled").checked = extensionConf.extensionMode !== "disabled";
  document.getElementById("_checkbox_ext-whitelist").checked = extensionConf.extensionMode === "whitelist";  

  for(var button in ExtPanel.siteOptions) {
    ExtPanel.siteOptions[button].classList.remove("selected");
  }

  if(site && extensionConf.sites[site]) {
    ExtPanel.siteOptions[extensionConf.sites[site].arStatus].classList.add("selected");
  }
  //#endregion extension-basics
  //
  // ------------
  //#region autoar - SET AUTOAR OPTIONS
  if(Debug.debug)
    console.log("Autodetect mode?", extensionConf.arDetect.mode, "| site & site options:", site, ",", (site && extensionConf.sites[site]) ? extensionConf.sites[site].arStatus : "fucky wucky?" );
  document.getElementById("_checkbox_autoArEnabled").checked = extensionConf.arDetect.mode !== "disabled";
  document.getElementById("_checkbox_autoar-whitelist").checked = extensionConf.arDetect.mode === "whitelist";  
  document.getElementById("_autoAr_disabled_reason").textContent = extensionConf.arDetect.DisabledReason;
  document.getElementById("_input_autoAr_timer").value = extensionConf.arDetect.timer_playing;

  for(var button in AutoArPanel.siteOptions) {
    AutoArPanel.siteOptions[button].classList.remove("selected");
  }

  if(site && extensionConf.sites[site]) {
    AutoArPanel.siteOptions[extensionConf.sites[site].arStatus].classList.add("selected");
  }
  //#endregion

  // process video alignment:
  if(extensionConf.miscFullscreenSettings.videoFloat){
    for(var button in ArPanel.alignment)
      ArPanel.alignment[button].classList.remove("selected");
    
    ArPanel.alignment[extensionConf.miscFullscreenSettings.videoFloat].classList.add("selected");
  }
  
  // process keyboard shortcuts:
  if(extensionConf.keyboard.shortcuts){
    for(var key in extensionConf.keyboard.shortcuts){
      var shortcut = extensionConf.keyboard.shortcuts[key];
      var keypress = stringToKeyCombo(key);
      
      
      try{
        if(shortcut.action == "crop"){
          if(shortcut.arg == 2.0){
            _changeAr_button_shortcuts["189"] = keypress;
          }
          else if(shortcut.arg == 2.39){
            _changeAr_button_shortcuts["219"] = keypress;
          }
          else if(shortcut.arg == 1.78){
            _changeAr_button_shortcuts["169"] = keypress;
          }
          else if(shortcut.arg == "fitw") {
            _changeAr_button_shortcuts["fitw"] = keypress;
          }
          else if(shortcut.arg == "fith") {
            _changeAr_button_shortcuts["fith"] = keypress;
          }
          else if(shortcut.arg == "reset") {
            _changeAr_button_shortcuts["reset"] = keypress;
          }
        }
        else if(shortcut.action == "auto-ar") {
            _changeAr_button_shortcuts["auto-ar"] = keypress;
        }
      }
      catch(Ex){
        //do nothing if key doesn't exist
      }
    }
    for(var key in _changeAr_button_shortcuts){
      try{
        document.getElementById(`_b_changeAr_${key}_key`).textContent = `(${_changeAr_button_shortcuts[key]})`;
      }
      catch(ex){
        
      }
    }
  }
  

  if(Debug.debug)
    console.log("[popup.js::loadConfig] config loaded");
}

async function getConf(){
  port.postMessage({cmd: 'get-config'});
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
    // if(!hasVideos)
    //   Menu.noVideo.classList.remove("hidden");
    // else{
      Menu[menu].classList.remove("hidden");
      if(Debug.debug){
        console.log("[popup.js::openMenu] unhid", menu, "| element: ", Menu[menu]);
      }
    // }
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
  
  // if(_config.arConf){
  //   if(! _config.arConf.enabled_global){
  //     ArPanel.autoar.disable.classList.add("hidden");
  //     ArPanel.autoar.enable.classList.remove("hidden");
      
  //     ArPanel.autoar.enable_tmp.textContent = "Temporarily enable";
  //     ArPanel.autoar.disable_tmp.textContent = "Temporarily disable";
  //   }
  //   else{
  //     ArPanel.autoar.disable.classList.remove("hidden");
  //     ArPanel.autoar.enable.classList.add("hidden");
      
  //     ArPanel.autoar.enable_tmp.textContent = "Re-enable";
  //     ArPanel.autoar.disable_tmp.textContent = "Temporarily disable";
  //   }
  //   if(! _config.arConf.enabled_current){
  //     ArPanel.autoar.disable_tmp.classList.add("hidden");
  //     ArPanel.autoar.enable_tmp.classList.remove("hidden");
  //   }
  //   else{
  //     ArPanel.autoar.disable_tmp.classList.remove("hidden");
  //     ArPanel.autoar.enable_tmp.classList.add("hidden");
  //   }
  // }
}


function toggleSite(option){
  if(Debug.debug)
    console.log("[popup::toggleSite] toggling extension 'should I work' status to", option, "on current site");
  
  Comms.sendToBackgroundScript({cmd:"enable-for-site", option:option});
}

function getMode(isEnabled, whitelistOnly) {
  if(isEnabled) {
    return whitelistOnly ? "whitelist" : "blacklist" 
  } else {
    return "disabled";
  }
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
      else if(e.target.classList.contains("_menu_autoar")){
        openMenu("autoAr");
      }
      
      // don't send commands
      return;
    }
    if(e.target.classList.contains("_ext")) {
      var command = {};
      if(e.target.classList.contains("_ext_enabled")){
        var extStatus = document.getElementById("_checkbox_ext-enabled").checked;
        var whitelist = document.getElementById("_checkbox_ext-whitelist").checked;

        // if extension is set to disabled, we also disable 'whitelist only' checkbox
        document.getElementById("_checkbox_ext-whitelist").disabled = !extStatus;

        return {
          cmd: "set-extension-defaults",
          mode: getMode(extStatus, whitelist),
          sender: "popup",
          receiver: "uwbg"
        };
      } else if (e.target.classList.contains("_ext_whitelist-only")) {
        var extStatus = document.getElementById("_checkbox_ext-enabled").checked;
        var whitelist = document.getElementById("_checkbox_ext-whitelist").checked;

        return {
          cmd: "set-extension-defaults",
          mode: getMode(extStatus, whitelist),
          sender: "popup",
          receiver: "uwbg"
        };
      } else if (e.target.classList.contains("_ext_site_options")) {
        command.cmd = "set-extension-for-site";
        if(e.target.classList.contains("_blacklist")){
          command.mode = "disabled";
        } else if(e.target.classList.contains("_whitelist")) {
          command.mode = "enabled";
        } else {
          command.mode = "default";
        }
        return command;
      }
    }
    if(e.target.classList.contains("_changeAr")){
      if(e.target.classList.contains("_ar_auto")){
        command.cmd = "autoar-start";
        command.enabled = true;
        return command;
      }
      if(e.target.classList.contains("_ar_reset")){
        command.cmd = "set-ar";
        command.ratio = "reset";
        return command;
      }
      if(e.target.classList.contains("_ar_fitw")){
        command.cmd = "set-ar";
        command.ratio = "fitw";
        return command;
      }
      if(e.target.classList.contains("_ar_fitw")){
        command.cmd = "set-ar";
        command.ratio = "fith";
        return command;
      }
      if(e.target.classList.contains("_ar_219")){
        command.cmd = "set-ar";
        command.ratio = 2.39;
        return command;
      }
      if(e.target.classList.contains("_ar_189")){
        command.cmd = "set-ar";
        command.ratio = 2.0;
        return command;
      }
      if(e.target.classList.contains("_ar_169")){
        command.cmd = "set-ar";
        command.ratio = 1.78;
        return command;
      }
      if(e.target.classList.contains("_ar_1610")){
        command.cmd = "set-ar";
        command.ratio = 1.6;
        return command;
      }
    }
    if(e.target.classList.contains("_stretch")){
      if(e.target.classList.contains("_ar_stretch_none")) {
        command.cmd = "set-stretch";
        command.mode = "NO_STRETCH";
      } else if(e.target.classList.contains("_ar_stretch_basic")) {
        command.cmd = "set-stretch";
        command.mode = "BASIC";
      } else if(e.target.classList.contains("_ar_stretch_hybrid")) {
        command.cmd = "set-stretch";
        command.mode = "HYBRID";
      } else if(e.target.classList.contains("_ar_stretch_conditional")) {
        command.cmd = "set-stretch";
        command.mode = "CONDITIONAL";
      }
      return command;
    }
    if(e.target.classList.contains("_autoAr")){

      var command = {};
      if(e.target.classList.contains("_autoAr_enabled")){
        var arStatus = document.getElementById("_checkbox_autoArEnabled").checked;
        var whitelist = document.getElementById("_checkbox_autoar-whitelist").checked;

        // if autoar is set to disabled, we also disable 'whitelist only' checkbox
        document.getElementById("_checkbox_autoar-whitelist").disabled = !arStatus;

        return {
          cmd: "set-autoar-defaults",
          mode: getMode(arStatus, whitelist),
          sender: "popup",
          receiver: "uwbg"
        };
      } else if (e.target.classList.contains("_autoAr_whitelist-only")) {
        var arStatus = document.getElementById("_checkbox_autoArEnabled").checked;        
        var whitelist = document.getElementById("_checkbox_autoar-whitelist").checked;

        return {
          cmd: "set-autoar-mode",
          mode: getMode(arStatus, whitelist),
          sender: "popup",
          receiver: "uwbg"
        };
      } else if (e.target.classList.contains("_save_autoAr_frequency")) {
        var value = parseInt(document.getElementById("_input_autoAr_frequency").value.trim());
        
        if(! isNaN(value)){
          var timeout = parseInt(1000 / value);
          command = {cmd: "autoar-set-timer-playing", timeout: timeout, sender: "popup", receiver: "uwbg"};
          Comms.sendToBackgroundScript(command);
        }
        return;
      } else if (e.target.classList.contains("_ar_site_options")) {
        command.cmd = "set-autoar-for-site";
        if(e.target.classList.contains("_blacklist")){
          command.mode = "disabled";
        } else if(e.target.classList.contains("_whitelist")) {
          command.mode = "enabled";
        } else {
          command.mode = "default";
        }
        return command;
      }
    }
    
    if(e.target.classList.contains("_align")){
      
      command.global = true;
      
      if(e.target.classList.contains("_align_left")){
        command.cmd = "force-video-float",
        command.newFloat = "left"
        
        // console.log(".................\n\n\n..........\n\n              >>command<< \n\n\n\n            ",command,"\n\n\n.........\n\n\n................................");
        
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
    if(e.target.classList.contains("extensionEnabledOnCurrentSite")){  // legacy? can be removed?
      toggleSite(document.extensionEnabledOnCurrentSite.mode.value);
    }
    
  }
  
  var command = getcmd(e);  
  if(command)
    port.postMessage(command);
  
  return true;
});

hideWarning("script-not-running-warning");
openMenu(selectedMenu);
// check4videos();
getConf();

// check4siteStatus();
