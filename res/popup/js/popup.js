if(Debug.debug)
  console.log("[popup.js] loading popup script!");

document.getElementById("uw-version").textContent = browser.runtime.getManifest().version;


var selectedMenu = "";
var selectedSubitem = {
  'siteSettings': undefined,
  'videoSettings': undefined,
}

var hasVideos = false;

var zoom_videoScale = 1;

var _config; 
var _changeAr_button_shortcuts = { "autoar":"none", "reset":"none", "219":"none", "189":"none", "169":"none", "custom":"none" }

var comms = new Comms();
var settings = new Settings(undefined, () => updateConfig());

var site = undefined;

var port = browser.runtime.connect({name: 'popup-port'});
port.onMessage.addListener( (m,p) => processReceivedMessage(m,p));

var _video_settings_tab_items = [];


//#region build ui
var tablist = {
  'extensionSettings': new MenuItem('_menu_item_settings_ext', 'Extension settings', '', () => showMenu('extensionSettings')),
  'siteSettings': new MenuItem('_menu_item_settings_site', 'Site settings', 'Settings for current site', () => showMenu('siteSettings')),
  'videoSettings': new MenuItem('_menu_item_settings_video', 'Video settings', 'Crop & stretch options for videos on current page', () => showMenu('videoSettings')),
  'about': new MenuItem('_menu_item_about', 'About Ultrawidify', '', () => showMenu('about'))
};

for (let t in tablist) {
  tablist[t].appendTo(document.getElementById('tablist'));
}




function loadFrames(videoTab) {
  tablist['siteSettings'].removeSubitems();
  tablist['videoSettings'].removeSubitems();

  for (var frame in videoTab.frames) {
    const nid = `_vsi_${videoTab.id}-${videoTab.frames[frame].id}`;
    var newItem = new TabItem(
      undefined,
      nid,
      videoTab.frames[frame].host,
      videoTab.frames[frame].url != videoTab.url,
      (click) => {
        tablist[selectedMenu].selectSubitem(nid);
        selectedSubitem[selectedMenu] = nid;
        // todo: set selected subitem
      }
    )
    
    tablist['siteSettings'].insertSubitem(newItem);
    tablist['videoSettings'].insertSubitem(newItem);
  }

  if (! selectedSubitem.siteSettings) {
    tablist['siteSettings'].selectFirstSubitem();
  } else {
    tablist['siteSettings'].selectSubitem(selectedSubitem.siteSettings)
  }
  if (! selectedSubitem.videoSettings) {
    tablist['videoSettings'].selectFirstSubitem();
  } else {
    tablist['videoSettings'].selectSubitem(selectedSubitem.videoSettings);
  }
}

//#endregion

async function processReceivedMessage(message, port){
  if (Debug.debug) {
    console.log("[popup.js] received message", message)
  }

  if(message.cmd === 'set-current-site'){
    if (site) {
      if (!site.host) {
        // dunno why this fix is needed, but sometimes it is
        site.host = site.tabHostname;
      }
    }
    if (!site || site.host !== message.site.host) {
      port.postMessage({cmd: 'get-current-zoom'});
    }
    site = message.site;
    if(message.site.host)
    loadConfig(message.site.host);
    loadFrames(message.site);
  } else if (message.cmd === 'set-current-zoom') {
    setCurrentZoom(message.zoom);
  }
}

async function updateConfig() {
  if (Debug.debug) {
    console.log("[popup.js] settings changed. updating popup if site exists. Site:", site.host);
  }

  if (site && site.host) {
    loadConfig(site.host);
  }
}

async function setCurrentZoom(scale) {
  zoom_videoScale = scale;

  if(Debug.debug) {
    console.log("[popup.js::setCurrentZoom] we're setting zoom:", zoom_videoScale);
  }

  VideoPanel.inputs.zoomSlider.value = Math.log2(zoom_videoScale);
  VideoPanel.labels.zoomLevel.textContent = (zoom_videoScale * 100).toFixed();
}

function hideWarning(warn){
  // document.getElementById(warn).classList.add("hidden");
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

function configurePopupTabs(site) {
  // todo: this can potentially be removed

  // Determine which tabs can we touch.
  // If extension is disabled, we can't touch 'site settings' and 'video settings'
  // If extension is enabled, but site is disabled, we can't touch 'video settings'
  var extensionEnabled = settings.extensionEnabled();
  var extensionEnabledForSite = settings.extensionEnabledForSite(site);


  if (extensionEnabledForSite || extensionEnabled) {
    tablist['videoSettings'].enable();
  } else {
    tablist['videoSettings'].disable();
  }

  // if popup isn't being opened for the first time, there's no reason to switch
  // we're already in this tab
  if (!selectedMenu) {
    showMenu('videoSettings');
  }
}

function configureGlobalTab() {
  return; // todo: revisit
  if (Debug.debug) {
    console.log("[popup.js] Configuring global tab (ExtPanel).",
    "\nextension mode:  ", settings.active.extensionMode,
    "\narDetect mode:   ", settings.active.arDetect.mode,
    "\nvideo float mode:", settings.active.miscFullscreenSettings.videoFloat,
    "\nstretch mode:    ", settings.active.stretch.initialMode,
    "\n..")
  }


  for(var button in ExtPanel.extOptions) {
    ExtPanel.extOptions[button].classList.remove("selected");
  }
  for(var button in ExtPanel.arOptions) {
    ExtPanel.arOptions[button].classList.remove("selected");
  }
  for(var button in ExtPanel.alignment) {
    ExtPanel.alignment[button].classList.remove("selected");
  }
  for(var button in ExtPanel.stretch) {
    ExtPanel.stretch[button].classList.remove("selected");
  }

  ExtPanel.extOptions[settings.active.extensionMode].classList.add("selected");
  ExtPanel.arOptions[settings.active.arDetect.mode].classList.add("selected");
  ExtPanel.alignment[settings.active.miscFullscreenSettings.videoFloat].classList.add("selected");
  ExtPanel.stretch[settings.active.stretch.initialMode].classList.add("selected");
}

function configureSitesTab(site) {
  return; // todo: revisit
  if (Debug.debug) {
    console.log("[popup.js] Configuring sites tab (SitePanel).",
    "\nsite:            ", site,
    "\nextension mode:    ", settings.active.sites[site.host] ? settings.active.sites[site.host].status : 'no site-special settings for this site',
    "\narDetect mode:   ", settings.active.sites[site.host] ? settings.active.sites[site.host].arStatus : 'no site-special settings for this site',
    "\nvideo float mode:", settings.active.sites[site.host] ? settings.active.sites[site.host].videoFloat : 'no site-special settings for this site',
    "\ndefault ar:      ", settings.active.sites[site.host] ? settings.active.sites[site.host].ar : 'no site-special settings for this site',
    "\nstretch mode:    ", settings.active.sites[site.host] ? settings.active.sites[site.host].stretch : 'no site-special settings for this site',
    "\n...")
  }

  for(const button in SitePanel.extOptions) {
    SitePanel.extOptions[button].classList.remove("selected");
  }
  for(const button in SitePanel.arOptions) {
    SitePanel.arOptions[button].classList.remove("selected");
  }
  for(const button in SitePanel.alignment) {
    SitePanel.alignment[button].classList.remove("selected");
  }
  for(const button in SitePanel.stretch) {
    SitePanel.stretch[button].classList.remove("selected");
  }

  if (settings.active.sites[site.host] && settings.active.sites[site.host]) {
    console.log("settings for", site, "exist!")
    SitePanel.extOptions[settings.active.sites[site.host].status].classList.add("selected");
    SitePanel.arOptions[settings.active.sites[site.host].arStatus].classList.add("selected");
  } else {
    SitePanel.extOptions.default.classList.add("selected");
    SitePanel.arOptions.default.classList.add("selected");
  }

  // optional settings:
  if (settings.active.sites[site.host] && settings.active.sites[site.host].videoAlignment) {
    SitePanel.alignment[settings.active.sites[site.host].videoAlignment].classList.add("selected");
  } else {
    SitePanel.alignment.default.classList.add('selected');
  }

  if(settings.active.sites[site.host] && settings.active.sites[site.host].stretch !== undefined) {  // can be 0
    SitePanel.stretch[settings.active.sites[site.host].stretch].classList.add("selected");
  } else {
    SitePanel.stretch['-1'].classList.add("selected");
  }
}

function configureVideoTab() {
  // process keyboard shortcuts for crop settings
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
    }

    // fill in custom aspect ratio
    if (settings.active.keyboard.shortcuts.q) {
      document.getElementById("_input_custom_ar").value = settings.active.keyboard.shortcuts.q.arg;
    }

    for(var key in _changeAr_button_shortcuts){
      try{
        document.getElementById(`_b_changeAr_${key}_key`).textContent = `(${_changeAr_button_shortcuts[key]})`;
      }
      catch(ex){
        
      }
    }
  }

  // todo: get min, max from settings
  VideoPanel.inputs.zoomSlider.min = Math.log2(0.5);
  VideoPanel.inputs.zoomSlider.max = Math.log2(8);
  VideoPanel.inputs.zoomSlider.value = Math.log2(zoom_videoScale);

  VideoPanel.inputs.zoomSlider.addEventListener('input', (event) => {
    var newZoom = Math.pow(2, VideoPanel.inputs.zoomSlider.value);

    // save value so it doesn't get reset next time the popup updates
    zoom_videoScale = newZoom;

    // update zoom% label
    VideoPanel.labels.zoomLevel.textContent = (newZoom * 100).toFixed();

    // send the command to bg script
    var command = {
      cmd: 'set-zoom',
      zoom: newZoom
    };

    port.postMessage(command);
  });
}

async function loadConfig(site){

  console.log("NEW CONFIG!")

  if (Debug.debug) {
    console.log("\n\n-------------------------------------\n[popup.js::loadConfig] loading config. conf object:", settings.active);
  }

  configurePopupTabs(site);
  configureGlobalTab();
  configureSitesTab(site);
  configureVideoTab();

  if (Debug.debug) {
    console.log("[popup.js::loadConfig] config loaded\n-----------------------\n\n");
  }
}

function removeAll(itemArray) {
  for(item of itemArray) {
    item.remove();
  }
}

function unselect(itemArray, extraClasses) {
  for(item of itemArray) {
    item.classList.remove('selected');
    if (extraClasses) {
      item.classList.remove(extraClasses);
    }
  }
}



async function getSite(){
  if (Debug.debug) {
    console.log("[popup.js] requesting current site");
  }
  
  try {
    port.postMessage({cmd: 'get-current-site'});
  } catch (e) {
    console.log("[popup::getSite] sending get-current-site failed for some reason. Reason:", e)
  }
}

function openMenu(menu){
  if(Debug.debug){
    console.log("[popup.js::openMenu] trying to open menu", menu, "\n element: ", Menu[menu]);
  }
  
  for(var m in Menu){
    if(Menu[m])
      Menu[m].classList.add("hidden");
  }
  for(var m in MenuTab){
    if(MenuTab[m])
      MenuTab[m].classList.remove("selected");
  }
  
  Menu[menu].classList.remove("hidden"); 
  MenuTab[menu].classList.add("selected");

  selectedMenu = menu;

}

function showMenu(tab) {
  if (!tablist) {
    // todo: fix & remove this
    return;
  }
  for (const i in tablist) {
    tablist[i].unselect();
    tablist[i].hideSubitems();
  }
  tablist[tab].select();
  tablist[tab].showSubitems();

  // todo: display the correct tab 

  selectedMenu = tab;
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
  const valueSaveButton = document.getElementById("_b_autoar_save_autoar_timer");

  if (! isNaN(parseInt(inputField.value.trim().value()))) {
    inputField.classList.remove("invalid-input");
    valueSaveButton.classList.remove("disabled-button");
  } else {
    inputField.classList.add("invalid-input");
    valueSaveButton.classList.add("disabled-button");
  }
}

document.addEventListener("click", (e) => {
  if(Debug.debug) {
    console.log("[popup.js] something clicked. event:", e, JSON.stringify(e));
  }
  
  function getcmd(e){
    var command = {};
    command.sender = "popup";
    command.receiver = "uwbg";
    
    if(e.target.classList.contains("disabled"))
      return;
    
    // if(e.target.classList.contains("menu-item")){

    //   if(Debug.debug) {
    //     console.log("[popup.js::eventListener] clicked on a tab. Class list:", e.target.classList);
    //   }

    //   if(e.target.classList.contains("_menu_tab_settings_ext")){
    //     openMenu("extensionSettings");
    //   } else if(e.target.classList.contains("_menu_tab_settings_site")){
    //     openMenu("siteSettings");
    //   } else if(e.target.classList.contains("_menu_tab_settings_video")){
    //     openMenu("videoSettings");
    //   } else if(e.target.classList.contains("_menu_tab_about")){
    //     openMenu("about");
    //   }
      
    //   // don't send commands
    //   return;
    // }
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
        var mode; 
        if(e.target.classList.contains("_blacklist")){
          mode = "disabled";
        } else if(e.target.classList.contains("_whitelist")) {
          mode = "enabled";
        } else {
          mode = "default";
        }
        
        if(settings.active.sites[site.host]) {
          settings.active.sites[site.host].status = mode;
          settings.active.sites[site.host].statusEmbedded = mode;
        } else {
          settings.active.sites[site.host] = {
            status: mode,
            statusEmbedded: mode,
            arStatus: 'default',
            type: 'user-defined'
          }
        }
        settings.save();
        return;
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
      // stretch, global
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

      // stretch, site
      if (e.target.classList.contains("_ar_stretch_site")) {
        if (e.target.classList.contains("_none")) {
          settings.active.sites[site.host].stretch = 0;
        } else if (e.target.classList.contains("_basic")) {
          settings.active.sites[site.host].stretch = 1;
        } else if (e.target.classList.contains("_hybrid")) {
          settings.active.sites[site.host].stretch = 2;
        } else if (e.target.classList.contains("_conditional")) {
          settings.active.sites[site.host].stretch = 3;
        } else {
          delete(settings.active.sites[site.host].stretch);
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
      } else if (e.target.classList.contains("_save_autoAr_timer")) {
        var value = parseInt(document.getElementById("_input_autoAr_timer").value.trim());
        
        if(! isNaN(value)){
          var timeout = parseInt(value);
          settings.active.arDetect.timer_playing = timeout;
          settings.save();
        }
        return;
      } else if (e.target.classList.contains("_ar_site_options")) {
        var mode;
        if(e.target.classList.contains("_disabled")){
          mode = "disabled";
        } else if(e.target.classList.contains("_enabled")) {
          mode = "enabled";
        } else {
          mode = "default";
        }

        if(settings.active.sites[site.host]) {
          settings.active.sites[site.host].arStatus = mode;
        } else {
          settings.active.sites[site.host] = {
            status: settings.active.extensionMode,
            statusEmbedded: settings.active.extensionMode,
            arStatus: mode,
            type: 'user-defined'
          }
        }
        settings.save();
        return;
      }
    }
    

    if (e.target.classList.contains("_align_ext")) {
      if (e.target.classList.contains("_align_ext_left")) {
        settings.active.miscFullscreenSettings.videoFloat = 'left';
      } else if (e.target.classList.contains("_align_ext_center")) {
        settings.active.miscFullscreenSettings.videoFloat = 'center';
      } else if (e.target.classList.contains("_align_ext_right")) {
        settings.active.miscFullscreenSettings.videoFloat = 'right';
      }

      settings.save();
      return;
    }
    if (e.target.classList.contains("_align_site")) {
      if (!site) {
        return;
      }
      if (e.target.classList.contains("_align_site_left")) {
        settings.active.sites[site.host].videoAlignment = 'left';
      } else if (e.target.classList.contains("_align_site_center")) {
        settings.active.sites[site.host].videoAlignment = 'center';
      } else if (e.target.classList.contains("_align_site_right")) {
        settings.active.sites[site.host].videoAlignment = 'right';
      } else {
        // default case — remove this object
        delete(settings.active.sites[site.host].videoAlignment);
      }

      settings.save();
      return;
    }
    if (e.target.classList.contains("_align")) {
      command.cmd = "set-alignment";

      if (e.target.classList.contains("_align_video_left")) {
        command.mode = 'left';
      } else if (e.target.classList.contains("_align_video_center")) {
        command.mode = 'center';
      } else if (e.target.classList.contains("_align_video_right")) {
        command.mode = 'right';
      }
      
      return command;
    }

    //#region zoom buttons
    if (e.target.classList.contains("_zoom_show_shortcuts")) {
      VideoPanel.misc.zoomShortcuts.classList.remove("hidden");
      VideoPanel.buttons.zoom.hideShortcuts.classList.remove("hidden");
      VideoPanel.buttons.zoom.showShortcuts.classList.add("hidden");
      return;
    }
    if (e.target.classList.contains("_zoom_hide_shortcuts")) {
      VideoPanel.misc.zoomShortcuts.classList.add("hidden");
      VideoPanel.buttons.zoom.hideShortcuts.classList.add("hidden");
      VideoPanel.buttons.zoom.showShortcuts.classList.remove("hidden");
      return;
    }
    if (e.target.classList.contains("_zoom_reset")) {
      zoom_videoScale = scale;
      VideoPanel.labels.zoomLevel.textContent = 100;
      VideoPanel.inputs.zoomSlider.value = 0;         // log₂(1)
      
      command.cmd = 'set-zoom';
      command.zoom = 1;
      return command;
    }
    //#endregion
    //#region show/hide custom ar
    if (e.target.classList.contains("_changeAr_show_customAr")) {
      VideoPanel.misc.customArChanger.classList.remove("hidden");
      VideoPanel.buttons.changeAr.showCustomAr.classList.add("hidden");
      VideoPanel.buttons.changeAr.hideCustomAr.classList.remove("hidden");
      return;
    }
    if (e.target.classList.contains("_changeAr_hide_customAr")) {
      VideoPanel.misc.customArChanger.classList.add("hidden");
      VideoPanel.buttons.changeAr.showCustomAr.classList.remove("hidden");
      VideoPanel.buttons.changeAr.hideCustomAr.classList.add("hidden");
      return;
    }
    //#endregion
  }
  
  var command = getcmd(e);

  if(Debug.debug) {
    console.log("[popup.js] Got command (can be undefined):", command, JSON.stringify(command))
  }

  if(command)
    port.postMessage(command);
  
  return true;
});




async function sleep(t) {
  return new Promise( (resolve,reject) => {
    setTimeout(() => resolve(), t);
  });
}

async function popup_init() {
  // let's init settings and check if they're loaded
  await settings.init();

  if (Debug.debug) {
    console.log("[popup] Are settings loaded?", settings)
  }


  const customArInputField = document.getElementById("_input_custom_ar");
  const autoarFrequencyInputField = document.getElementById("_input_autoAr_timer");

  customArInputField.addEventListener("blur", (event) => {
    validateCustomAr();
  });
  customArInputField.addEventListener("mouseleave", (event) => {
    validateCustomAr();
  });

  // autoarFrequencyInputField.addEventListener("blur", (event) => {
  //   validateAutoArTimeout();
  // });
  // autoarFrequencyInputField.addEventListener("mouseleave", (event) => {
  //   validateAutoArTimeout();
  // });

  hideWarning("script-not-running-warning");
  while (true) {
    console.log("GETTING SITE")
    getSite();
    await sleep(5000);
  }
}

popup_init();