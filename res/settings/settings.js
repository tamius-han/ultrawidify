function showAbout(){
  clearPage();
  
  document.getElementById("about").classList.remove("hide");
  document.getElementById("tab_about").classList.add("tab-selected");
}
function showShortcuts(){
  clearPage();
  
  document.getElementById("uw_shortcuts").classList.remove("hide");
  document.getElementById("tab_shortcuts").classList.add("tab-selected");
}
function showGeneralSettings(){
  clearPage();
  
  document.getElementById("general_settings").classList.remove("hide");
  document.getElementById("tab_general_settings").classList.add("tab-selected");
}

function showSites(){
  clearPage();
  document.getElementById("uw_sites").classList.remove("hide");
  document.getElementById("tab_sites").classList.add("tab-selected");
}

function clearPage(){
  // Hide you sections
  document.getElementById("uw_shortcuts").classList.add("hide");
  document.getElementById("about").classList.add("hide");
  document.getElementById("general_settings").classList.add("hide");
  document.getElementById("uw_sites").classList.add("hide");
  
  // Hide you tabs
  document.getElementById("tab_shortcuts").classList.remove("tab-selected");
  document.getElementById("tab_about").classList.remove("tab-selected");
  document.getElementById("tab_general_settings").classList.remove("tab-selected");
  document.getElementById("tab_sites").classList.remove("tab-selected");
  
}



async function loadKeybinds(){
  // load showShortcuts
  var keybinds = await Keybinds.fetch();

  for(var key in keybinds){
    if(Debug.debug)
      console.log("[settings.js::loadKeybinds] we're looking at this key:", key, "it splits like this:", key.toLowerCase().split("_"));
    
    var keypressArr = key.split("_");
    var opts = keybinds[key];
    
    var query = "_kbd_" + opts.action + "_";
    if(opts.action == "char"){
      if(opts.targetAr == 2.39)
        query += ("219_");
      else if(opts.targetAr == 2.0)
        query += ("189_");
      else if(opts.targetAr == 1.78)
        query += ("169_");
    }
    
    var q2;
    for(var modKey of Keybinds.mods){
      q2 = "#" + query + modKey;
      document.querySelector(q2).checked = keypressArr.indexOf(modKey) != -1;
    }
    q2 = "#" + query + "lettr";
    document.querySelector(q2).value = keypressArr[keypressArr.length - 1].toLowerCase();
  }
}

async function saveKeybinds(){
   
  var actions = [ "autoar", "fitw", "fith", "reset", "char_219", "char_189", "char_169" ];
  
  var savedShortcuts = {};
  
  for(var action of actions){
    var queryBase = "#_kbd_" + action;
    var letter = document.querySelector(queryBase + "_lettr").value.trim();
    
    if(letter === "" || letter === undefined)
      continue; // we don't make a shortcut for this action
    
    var shortcutKeypress = "";
    
    for(mod of Keybinds.mods)
      if(document.querySelector(queryBase + "_" + mod).checked)
        shortcutKeypress += (mod + "_");
    
    shortcutKeypress += letter;
      
    savedShortcuts[shortcutKeypress] = {};
    
    if(action.startsWith("char_")){
      savedShortcuts[shortcutKeypress].action = "char";
      
      if(action == "char_219")
        savedShortcuts[shortcutKeypress].targetAr = 2.39;
      else if(action == "char_189")
        savedShortcuts[shortcutKeypress].targetAr = 2.0;
      else if(action == "char_169")
        savedShortcuts[shortcutKeypress].targetAr = 1.78;
    }
    else{
      savedShortcuts[shortcutKeypress].action = action;
    }
  }
  
  // out with the old
  await StorageManager.delopt("keybinds");
  //in with the new
  StorageManager.setopt({"keybinds":savedShortcuts});
}


// page init
// document.addEventListener("DOMContentLoaded", loadopts);

document.querySelector("#tab_shortcuts").addEventListener("click", showShortcuts);
document.querySelector("#tab_about").addEventListener("click", showAbout);
// document.querySelector("#tab_general_settings").addEventListener("click",showGeneralSettings);
// document.querySelector("#tab_sites").addEventListener("click", showSites);

document.querySelector("#kb_save").addEventListener("click", saveKeybinds);
document.querySelector("#kb_cancel").addEventListener("click", loadKeybinds);

// document.querySelector("#enable_autoar").addEventListener("click",saveAutoar);
// document.querySelector("#enable_ui").addEventListener("click", saveUI);
// document.querySelector("#enable_ui_compact").addEventListener("click", saveUI);

loadKeybinds();
