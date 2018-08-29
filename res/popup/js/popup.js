if(Debug.debug)
  console.log("[popup.js] loading popup script!");

document.getElementById("uw-version").textContent = browser.runtime.getManifest().version;

var Menu = {};
// Menu.noVideo    = document.getElementById("no-videos-display");
Menu.general         = document.getElementById("extension-mode");
Menu.thisSite        = document.getElementById("settings-for-current-site");
Menu.arSettings      = document.getElementById("aspect-ratio-settings");
Menu.autoAr          = document.getElementById("autoar-basic-settings");
Menu.cssHacks        = document.getElementById("css-hacks-settings");
Menu.about           = document.getElementById("panel-about");
Menu.stretchSettings = document.getElementById("stretch-settings")

var MenuTab = {};
MenuTab.general         = document.getElementById("_menu_general");
MenuTab.thisSite        = document.getElementById("_menu_this_site");
MenuTab.arSettings      = document.getElementById("_menu_aspectratio");
MenuTab.cssHacks        = document.getElementById("_menu_hacks");
MenuTab.about           = document.getElementById("_menu_about");
MenuTab.autoAr          = document.getElementById("_menu_autoar");
MenuTab.stretchSettings = document.getElementById("_menu_stretch");

var ExtPanel = {};
ExtPanel.globalOptions = {};
ExtPanel.globalOptions.blacklist = document.getElementById("_ext_global_options_blacklist");
ExtPanel.globalOptions.whitelist = document.getElementById("_ext_global_options_whitelist");
ExtPanel.globalOptions.disabled  = document.getElementById("_ext_global_options_disabled");
ExtPanel.siteOptions = {};
ExtPanel.siteOptions.disabled = document.getElementById("_ext_site_options_blacklist");
ExtPanel.siteOptions.enabled  = document.getElementById("_ext_site_options_whitelist");
ExtPanel.siteOptions.default  = document.getElementById("_ext_site_options_default");

var AutoArPanel = {};
AutoArPanel.globalOptions = {};
AutoArPanel.globalOptions.blacklist = document.getElementById("_ar_global_options_blacklist");
AutoArPanel.globalOptions.whitelist = document.getElementById("_ar_global_options_whitelist");
AutoArPanel.globalOptions.disabled  = document.getElementById("_ar_global_options_disabled");
AutoArPanel.siteOptions = {};
AutoArPanel.siteOptions.disabled = document.getElementById("_ar_site_options_disabled");
AutoArPanel.siteOptions.enabled  = document.getElementById("_ar_site_options_enabled");
AutoArPanel.siteOptions.default  = document.getElementById("_ar_site_options_default");

var ArPanel = {};
ArPanel.alignment = {};
ArPanel.alignment.left   = document.getElementById("_align_left");
ArPanel.alignment.center = document.getElementById("_align_center");
ArPanel.alignment.right  = document.getElementById("_align_right");
ArPanel.autoar = {};

var StretchPanel = {};
StretchPanel.global = {};
StretchPanel.global.none        = document.getElementById("_stretch_global_none");
StretchPanel.global.basic       = document.getElementById("_stretch_global_basic");
StretchPanel.global.hybrid      = document.getElementById("_stretch_global_hybrid");
StretchPanel.global.conditional = document.getElementById("_stretch_global_conditional");


var selectedMenu = "arSettings";
var hasVideos = false;

var _config; 
var _changeAr_button_shortcuts = { "autoar":"none", "reset":"none", "219":"none", "189":"none", "169":"none", "custom":"none" }

var comms = new Comms();
var settings = new Settings();

var port = browser.runtime.connect({name: 'popup-port'});
port.onMessage.addListener( (m,p) => processReceivedMessage(m,p));



// let's init settings and check if they're loaded
await settings.init();

if (Debug.debug) {
  console.log("[popup] Are settings loaded?", settings)
}






async function processReceivedMessage(message, port){
  if(message.cmd === 'set-config'){

    if(Debug.debug){
      console.log("[popup.js] setting config. Message was:", message)
    }

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

async function loadConfig(){

  if(Debug.debug)
    console.log("[popup.js::loadConfig] loading config. conf object:", settings.active, "\n\n\n\n\n\n\n\n-------------------------------------");
    

  // ----------------------
  //#region extension-basics - SET BASIC EXTENSION OPTIONS
  if(Debug.debug)
    console.log("EXT: site is:", site, "|settings for this site: ", (site && settings.active.sites[site]) ? settings.active.sites[site] : "default site")


  for(var button in ExtPanel.globalOptions) {
    ExtPanel.globalOptions[button].classList.remove("selected");
  }
  for(var button in ExtPanel.siteOptions) {
    ExtPanel.siteOptions[button].classList.remove("selected");
  }

  ExtPanel.globalOptions[settings.active.extensionMode].classList.add("selected");
  if(site && settings.active.sites[site]) {
    ExtPanel.siteOptions[settings.active.sites[site].status].classList.add("selected");
  } else {
    ExtPanel.siteOptions.default.classList.add("selected");
  }

  //#endregion extension-basics
  //
  // ------------
  //#region autoar - SET AUTOAR OPTIONS
  // if(Debug.debug)
    // console.log("Autodetect mode?", settings.active.arDetect.mode, "| site & site options:", site, ",", (site && settings.active.sites[site]) ? settings.active.sites[site].arStatus : "fucky wucky?" );
  // document.getElementById("_autoAr_disabled_reason").textContent = settings.active.arDetect.DisabledReason;
  document.getElementById("_input_autoAr_timer").value = settings.active.arDetect.timer_playing;


  for(var button in AutoArPanel.globalOptions) {
    AutoArPanel.globalOptions[button].classList.remove("selected");
  }
  for(var button in AutoArPanel.siteOptions) {
    AutoArPanel.siteOptions[button].classList.remove("selected");
  }


  AutoArPanel.globalOptions[settings.active.arDetect.mode].classList.add("selected");
  if(site && settings.active.sites[site]) {
    AutoArPanel.siteOptions[settings.active.sites[site].arStatus].classList.add("selected");
  } else {
    AutoArPanel.siteOptions.default.classList.add("selected");
  }
  //#endregion

  // process video alignment:
  if(settings.active.miscFullscreenSettings.videoFloat){
    for(var button in ArPanel.alignment)
      ArPanel.alignment[button].classList.remove("selected");
    
    ArPanel.alignment[settings.active.miscFullscreenSettings.videoFloat].classList.add("selected");
  }

  //#region - SET STRETCH

  // set stretching
  for (var button in StretchPanel.global) {
    StretchPanel.global[button].classList.remove("selected");
  }
  if (settings.active.stretch.initialMode === 0) {
    StretchPanel.global.none.classList.add("selected");
  } else if (settings.active.stretch.initialMode === 1) {
    StretchPanel.global.basic.classList.add("selected");
  } else if (settings.active.stretch.initialMode === 2) {
    StretchPanel.global.hybrid.classList.add("selected");
  } else if (settings.active.stretch.initialMode === 3) {
    StretchPanel.global.conditional.classList.add("selected");
  }
  //#endregion

  // process keyboard shortcuts:
  if(settings.active.keyboard.shortcuts){
    for(var key in settings.active.keyboard.shortcuts){
      var shortcut = settings.active.keyboard.shortcuts[key];
      var keypress = stringToKeyCombo(key);
      
      
      try{
        if(shortcut.action == "crop"){
          if (key == 'q') {
            _changeAr_button_shortcuts["custom"] = keypress;
          }
          else if(shortcut.arg == 2.0){
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

      // fill in custom aspect ratio
      if (settings.active.keyboard.shortcuts.q) {
        document.getElementById("_input_custom_ar").value = settings.active.keyboard.shortcuts.q.arg;
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
    if(Menu[m] === null)
      continue; //todo: remove menus that are no longer there
    
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


function getCustomAspectRatio() {
  var textBox_value = document.getElementById("_input_custom_ar").value.trim();
  // validate value - this spaghett will match the following stuff
  //   [int]/[int]
  //   1:[float]
  //   [float]
  if (! /(^[0-9]+\/[0-9]+$|^(1:)?[0-9]+\.?[0-9]*$)/.test(textBox_value)) {
    return false; // validation failed!
  }

  if (! isNaN(parseFloat(textBox_value))) {
    return parseFloat(textBox_value);
  }
  if (/\//.test(textBox_value)) {
    const vars = textBox_value.split('/');
    return parseInt(vars[0])/parseInt(vars[1]); // non-ints shouldn't make it past regex
  }
  if (/:/.test(textBox_value)) {
    const vars = textBox_value.split(':');
    return parseFloat(vars[1]);
  }

   // we should never come this far. 
   // If we do, then there's something wrong with the input and our regex
  return false;
}

function validateCustomAr(){
  const valid = getCustomAspectRatio() !== false;
  const inputField = document.getElementById("_input_custom_ar");
  const valueSaveButton = document.getElementById("_b_changeAr_save_custom_ar");

  if (valid) {
    inputField.classList.remove("invalid-input");
    valueSaveButton.classList.remove("disabled-button");
  } else {
    inputField.classList.add("invalid-input");
    valueSaveButton.classList.add("disabled-button");
  }
}

function validateAutoArTimeout(){
  const inputField = document.getElementById("_input_autoAr_timer");
  const valueSaveButton = document.getElementById("_b_autoar_save_autoar_frequency");

  if (! isNaN(parseInt(inputField.trim().value()))) {
    inputField.classList.remove("invalid-input");
    valueSaveButton.classList.remove("disabled-button");
  } else {
    inputField.classList.add("invalid-input");
    valueSaveButton.classList.add("disabled-button");
  }
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
      else if(e.target.classList.contains("_menu_stretch")){
        openMenu("stretchSettings");
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
      if(e.target.classList.contains("_ext_global_options")){
        if (e.target.classList.contains("_blacklist")) {
          settings.active.extensionMode = "blacklist";
        } else if (e.target.classList.contains("_whitelist")) {
          settings.active.extensionMode = "whitelist";
        } else {
          settings.active.extensionMode = "disabled";
        }
        settings.save();
        return;
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
      if(e.target.classList.contains("_ar_custom")){
        ratio = getCustomAspectRatio();
        command.cmd = "set-ar";
        command.ratio = ratio;
        return ratio !== false ? command : null;
      }
      if(e.target.classList.contains("_ar_save_custom_ar")){
        ratio = getCustomAspectRatio();
        command.cmd = "set-custom-ar";
        command.ratio = ratio;
        return ratio !== false ? command : null; // this validates input
      }
    }
    if(e.target.classList.contains("_stretch")){
      if (e.target.classList.contains("_ar_stretch_global")) {
        if (e.target.classList.contains("_none")) {
          settings.active.stretch.initialMode = 0;
        } else if (e.target.classList.contains("_basic")) {
          settings.active.stretch.initialMode = 1;
        } else if (e.target.classList.contains("_hybrid")) {
          settings.active.stretch.initialMode = 2;
        } else if (e.target.classList.contains("_conditional")) {
          settings.active.stretch.initialMode = 3;
        }
        settings.save();
        return;
      }

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
      if(e.target.classList.contains("_ar_global_options")){
        if (e.target.classList.contains("_blacklist")) {
          settings.active.arDetect.mode = "blacklist";
        } else if (e.target.classList.contains("_whitelist")) {
          settings.active.arDetect.mode = "whitelist";
        } else {
          settings.active.arDetect.mode = "disabled";
        }
        settings.save();
        return;
      } else if (e.target.classList.contains("_save_autoAr_frequency")) {
        var value = parseInt(document.getElementById("_input_autoAr_frequency").value.trim());
        
        if(! isNaN(value)){
          var timeout = parseInt(value);
          settings.active.arDetect.timer_playing = timeout;
          settings.save();
        }
        return;
      } else if (e.target.classList.contains("_ar_site_options")) {
        command.cmd = "set-autoar-for-site";
        if(e.target.classList.contains("_disabled")){
          command.mode = "disabled";
        } else if(e.target.classList.contains("_enabled")) {
          command.mode = "enabled";
        } else {
          command.mode = "default";
        }
        return command;
      }
    }
    
    if(e.target.classList.contains("_align")){
      
      command.global = true;
      
      if (e.target.classList.contains("_align_left")) {
        settings.active.miscFullscreenSettings.videoFloat = 'left';
      } else if (e.target.classList.contains("_align_center")) {
        settings.active.miscFullscreenSettings.videoFloat = 'center';
      } else if (e.target.classList.contains("_align_right")) {
        settings.active.miscFullscreenSettings.videoFloat = 'left';
      }

      settings.save();
      return;
    }    
  }
  
  var command = getcmd(e);  
  if(command)
    port.postMessage(command);
  
  return true;
});

const customArInputField = document.getElementById("_input_custom_ar");
const autoarFrequencyInputField = document.getElementById("_input_autoAr_timer");

customArInputField.addEventListener("blur", (event) => {
  validateCustomAr();
});
customArInputField.addEventListener("mouseleave", (event) => {
  validateCustomAr();
});

autoarFrequencyInputField.addEventListener("blur", (event) => {
  validateAutoArTimeout();
});
autoarFrequencyInputField.addEventListener("mouseleave", (event) => {
  validateAutoArTimeout();
});

hideWarning("script-not-running-warning");
openMenu(selectedMenu);
getConf();