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

var frameStore = {};
var frameStoreCount = 0;

var site = undefined;

// aside from hostname, this can have two additional values:
//   __playing — commands get sent to all frames with videos of status 'playing'
//   __all     — commands get sent to all frames
var selectedFrame = '__playing';

var port = browser.runtime.connect({name: 'popup-port'});
port.onMessage.addListener( (m,p) => processReceivedMessage(m,p));

var _video_settings_tab_items = [];

var selectedSubitemLoaded = false;

var tablist = {
  'extensionSettings': {
    tab: new MenuItem('_menu_item_settings_ext', 'Extension settings', '', () => showMenu('extensionSettings')),
    container: GlobalPanel.container,
  },
  'siteSettings': {
    tab: new MenuItem('_menu_item_settings_site', 'Site settings', 'Settings for current site', () => showMenu('siteSettings')),
    container: SitePanel.container
  },
  'videoSettings': {
    tab: new MenuItem('_menu_item_settings_video', 'Video settings', 'Crop & stretch options for videos on current page', () => showMenu('videoSettings')),
    container: VideoPanel.container
  },
  'about': {
    tab: new MenuItem('_menu_item_about', 'About Ultrawidify', '', () => showMenu('about')),
    container: AboutPanel.container
  }
};

for (let t in tablist) {
  tablist[t].tab.appendTo(document.getElementById('tablist'));
}


function loadFrames(videoTab) {
  tablist['siteSettings'].tab.removeSubitems();
  tablist['videoSettings'].tab.removeSubitems();

  if (!selectedSubitemLoaded) {
    if (videoTab.selected) {
      selectedSubitem = videoTab.selected;
      selectedSubitemLoaded = true;
    }
  }

  if (videoTab.frames.length < 2) {
    return;
  }

  function onTabitemClick(item) {
    tablist[selectedMenu].tab.selectSubitem(item);
    selectedSubitem[selectedMenu] = item;
    port.postMessage({cmd: 'popup-set-selected-tab', selectedMenu: selectedMenu, selectedSubitem: item});
  }



  for (var option of [{id: '__all', label: 'All'},{id: '__playing', label: 'Currently playing'}]) {
    const id = option.id;
    var newItem = new TabItem(
      undefined,
      option.id,
      option.label,
      false,
      () => onTabitemClick(id)
    );

    tablist['siteSettings'].tab.insertSubitem(newItem);
    tablist['videoSettings'].tab.insertSubitem(newItem);
  }


  for (var frame in videoTab.frames) {

    if (frame && !frameStore[frame]) {
      var fs = {
        name: frameStoreCount++,
        color: this.getRandomColor()
      }

      frameStore[frame] = fs;

      port.postMessage({
        cmd: 'mark-player',
        targetTab: videoTab.id,
        targetFrame: frame,
        name: fs.name,
        color: fs.color
      });
    }

    const nid = `${videoTab.id}-${videoTab.frames[frame].id}`;
    var newItem = new TabItem(
      undefined,
      nid,
      videoTab.frames[frame].host,
      videoTab.frames[frame].url != videoTab.url,
      (click) => onTabitemClick(nid),
      frameStore[frame]
    );
    
    tablist['siteSettings'].tab.insertSubitem(newItem);
    tablist['videoSettings'].tab.insertSubitem(newItem);





    
  }

  if (! selectedSubitem.siteSettings || !tablist['siteSettings'].tab.existsSubitem(selectedSubitem.siteSettings)) {
    selectedSubitem['siteSettings'] = tablist['siteSettings'].tab.selectFirstSubitem();
    console.log("selected first subitem!")
  } else {
    tablist['siteSettings'].tab.selectSubitem(selectedSubitem.siteSettings)
  }
  if (! selectedSubitem.videoSettings || !tablist['videoSettings'].tab.existsSubitem(selectedSubitem.videoSettings)) {
    selectedSubitem['videoSettings'] = tablist['videoSettings'].tab.selectFirstSubitem();
    console.log("selected first subitem (vs)!")
  } else {
    tablist['videoSettings'].tab.selectSubitem(selectedSubitem.videoSettings);
  }
}

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
    loadConfig(site.host);
    loadFrames(site);
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
  if (!selectedMenu) {
    showMenu('videoSettings');
  } else {
    showMenu(selectedMenu);
  }
  return;
}

function getRandomColor() {
  return `rgb(${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)}, ${Math.floor(Math.random() * 128)})`;
}


function basicCommandHandler(cmdArray, scope) {
  for (cmd of cmdArray) {
    port.postMessage({
      cmd: cmd.action,
      arg: cmd.arg,
      targetFrame: selectedSubitem[selectedMenu],
      scope: scope
    });
  }
}

function buildKeyboardShortcutString(keypress) {
  var shortcutCombo = '';

  if (keypress.ctrlKey) {
    shortcutCombo += 'Ctrl + ';
  }
  if (keypress.shiftKey) {
    shortcutCombo += 'Shift + ';
  }
  if (keypress.metaKey) {
    shortcutCombo += 'Meta + ';
  }
  if (keypress.altKey) {
    shortcutCombo += 'Alt + ';
  }
  shortcutCombo += keypress.key.toUpperCase();

  return shortcutCombo;
} 

function processButtonsForPopupCategory(category, buttons, scope) {
  if (buttons.length === 0) {
    category.container.hide();
  } else {
    category.buttons = {};
    category.buttonContainer.removeChildren();
    category.container.show();
    category.buttonContainer.show();

    for (var button of buttons) {
      var shortcutCombo = '';
      if (button.shortcut && button.shortcut[0].key) {
        shortcutCombo = buildKeyboardShortcutString(button.shortcut[0]);
      }

      const cmd = button.cmd;
      var nb = new ShortcutButton(
        '',
        button.label,
        shortcutCombo,
        () => basicCommandHandler(cmd, scope),
        ['w24']
      )
      nb.appendTo(category.buttonContainer);

      var buttonId = '';
      for (var c in cmd) {
        buttonId += `${c > 0 ? ';' : ''}${cmd[c].action}:${cmd[c].arg}`;
      }
      category.buttons[buttonId] = nb;
    }
  }
}

function selectButton(action, arg, buttons) {
  for (var b in buttons) {
    buttons[b].unselect();
  }
  const cmd=`${action}:${arg}`
  
  if (buttons[cmd]) {
    buttons[cmd].select();
  }
}

function configureGlobalTab() {
  const popupButtons = settings.getActionsForSite(site).filter(action => action.popup_global === true); 

  const extensionButtons = popupButtons.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-extension-mode');
  const autoarButtons = popupButtons.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-autoar-mode');
  const stretchButtons = popupButtons.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-stretch');
  const alignButtons = popupButtons.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-alignment');

  processButtonsForPopupCategory(GlobalPanel.elements.extensionSettings, extensionButtons, 'site');
  processButtonsForPopupCategory(GlobalPanel.elements.autoarSettings, autoarButtons, 'site');
  processButtonsForPopupCategory(GlobalPanel.elements.stretchSettings, stretchButtons);
  processButtonsForPopupCategory(GlobalPanel.elements.alignmentSettings, alignButtons);

  selectButton('set-stretch', settings.active.stretch.initialMode, GlobalPanel.elements.stretchSettings.buttons);
  selectButton('set-alignment', settings.active.miscSettings.videoAlignment, GlobalPanel.elements.alignmentSettings.buttons);

  selectButton('set-extension-mode', settings.active.extensionMode, GlobalPanel.elements.extensionSettings.buttons);
  selectButton('set-extension-mode', settings.active.arDetect.mode, GlobalPanel.elements.autoarSettings.buttons);
}

function configureSitesTab(site) {
  const popupButtons = settings.getActionsForSite(site).filter(action => action.popup_site === true); 

  const extensionButtons = popupButtons.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-extension-mode');
  const autoarButtons = popupButtons.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-autoar-mode');
  const stretchButtons = popupButtons.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-stretch');
  const alignButtons = popupButtons.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-alignment');

  processButtonsForPopupCategory(SitePanel.elements.extensionSettings, extensionButtons, 'site');
  processButtonsForPopupCategory(SitePanel.elements.autoarSettings, autoarButtons, 'site');
  processButtonsForPopupCategory(SitePanel.elements.stretchSettings, stretchButtons, 'site');
  processButtonsForPopupCategory(SitePanel.elements.alignmentSettings, alignButtons, 'site');

  if (settings.active.sites[site.host] && settings.active.sites[site.host]) {
    selectButton('set-extension-mode', settings.active.sites[site.host].status, SitePanel.elements.extensionSettings.buttons);
    selectButton('set-autoar-mode', settings.active.sites[site.host].arStatus, SitePanel.elements.extensionSettings.buttons);
  } else {
    selectButton('set-extension-mode', 'default', SitePanel.elements.extensionSettings.buttons);
    selectButton('set-autoar-mode', 'default', SitePanel.elements.extensionSettings.buttons);
  }

  // optional settings:
  if(settings.active.sites[site.host] && settings.active.sites[site.host].stretch !== undefined) {  // can be 0
    selectButton('set-stretch', settings.active.sites[site.host].stretch, SitePanel.elements.stretchSettings.buttons)
  } else {
    selectButton('set-stretch', -1, SitePanel.elements.stretchSettings.buttons)
  }

  if (settings.active.sites[site.host] && settings.active.sites[site.host].videoAlignment) {
    selectButton('set-alignment', settings.active.sites[site.host].videoAlignment, SitePanel.elements.alignmentSettings.buttons);
  } else {
    selectButton('set-alignment', 'default', SitePanel.elements.alignmentSettings.buttons);
  }
}

function configureVideoTab(site) {
  const popupButtons = settings.getActionsForSite(site).filter(action => action.popup === true); 

  const cropButtons = popupButtons.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-ar');
  const stretchButtons = popupButtons.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-stretch');
  const alignButtons = popupButtons.filter(action => action.cmd.length === 1 && action.cmd[0].action === 'set-alignment');

  processButtonsForPopupCategory(VideoPanel.elements.cropSettings, cropButtons);
  processButtonsForPopupCategory(VideoPanel.elements.stretchSettings, stretchButtons);
  processButtonsForPopupCategory(VideoPanel.elements.alignmentSettings, alignButtons);

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
      zoom: newZoom,
      targetFrame: selectedSubitem[selectedMenu]
    };

    port.postMessage(command);
  });
}

async function loadConfig(site){

  if (Debug.debug) {
    console.log("\n\n-------------------------------------\n[popup.js::loadConfig] loading config. conf object:", settings.active);
  }

  configurePopupTabs(site);
  configureGlobalTab();
  configureSitesTab(site);
  configureVideoTab(site);

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
  if(Debug.debug) {
    console.log("[popup.js::showMenu] opening menu", tab, "tablist?", tablist)
  }
  if (!tablist) {
    // todo: fix & remove this
    return;
  }
  for (const i in tablist) {
    tablist[i].tab.unselect();
    tablist[i].tab.hideSubitems();
    tablist[i].container.hide();
  }
  tablist[tab].tab.select();
  tablist[tab].tab.showSubitems();
  tablist[tab].container.show();

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
  }
  
  var command = getcmd(e);
  if (!command)
    return;
  command.targetFrame = selectedSubitem[selectedMenu]

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


  // autoarFrequencyInputField.addEventListener("blur", (event) => {
  //   validateAutoArTimeout();
  // });
  // autoarFrequencyInputField.addEventListener("mouseleave", (event) => {
  //   validateAutoArTimeout();
  // });

  hideWarning("script-not-running-warning");
  while (true) {
    getSite();
    await sleep(5000);
  }
}

popup_init();
window.addEventListener("unload", () => {
  console.log("SENDING UNMARK COMMAND")
  port.postMessage({
    cmd: 'unmark-player',
  });
});