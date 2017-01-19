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

function clearPage(){
  // Hide you sections
  document.getElementById("uw_shortcuts").classList.add("hide");
  document.getElementById("about").classList.add("hide");
  document.getElementById("general_settings").classList.add("hide");
  
  // Hide you tabs
  document.getElementById("tab_shortcuts").classList.remove("tab-selected");
  document.getElementById("tab_about").classList.remove("tab-selected");
  document.getElementById("tab_general_settings").classList.remove("tab-selected");
  
}

function saveopts(){
  
  var actions = ["fitw", "fith", "reset", "zoom", "unzoom", "ar219", "ar169", "ar1610", "ar43", "autoar"];
  var new_keybinds = {};

  // Preberemo naš obrazec in iz njega naredimo nov objekt z bližnjicami.
  // Let's read our form and make a new object with keybinds.
  
  for(var i = 0; i < actions.length; i++){
    var action = actions[i];
    var targetAR = "";
    
    if(action == "ar219"){
      action = "char";
      targetAR = (21/9);
    }
    if(action == "ar169"){
      action = "char";
      targetAR = (16/9);
    }
    if(action == "ar1610"){
      action = "char";
      targetAR = (16/10);
    }
    if(action == "ar43"){
      action = "char";
      targetAR = (4/3);
    }
    
    if(targetAR != ""){
      var keybind = {
        action: action,
        targetAR: targetAR,
        key: document.querySelector("#" + actions[i] + "_letter").value.toLowerCase().replace(/[^a-z0-9]/,""),
        modifiers: []
      }
    }
    else{
      var keybind = {
        action: action,
        key: document.querySelector("#" + actions[i] + "_letter").value.toLowerCase().replace(/[^a-z0-9]/,""),
        modifiers: []
      }
    }
    
    if(document.querySelector("#" + actions[i] + "_ctrl").checked)
      keybind.modifiers.push("ctrl");
    if(document.querySelector("#" + actions[i] + "_alt").checked)
      keybind.modifiers.push("alt");
    if(document.querySelector("#" + actions[i] + "_shift").checked)
      keybind.modifiers.push("shift");
    
    new_keybinds[i] = keybind;
  }
  
  // Preveriti moramo, da nismo dvema možnostima dodali isto bližnjico.
  // We need to check if all keybinds are unique.
  
  var fail = false;

  for(var i = 0; i < actions.length; i++)
    document.querySelector("#" + actions[i] + "_letter").classList.remove("dup_keybinds");
  
  for(var i = 0; i < actions.length; i++){
    if(new_keybinds[i].key == "")
      continue;
    
    for(var j = i + 1; j < actions.length; j++){
      if(new_keybinds[i].key == new_keybinds[j].key){
        if(compareModifiers(new_keybinds[i].modifiers, new_keybinds[j].modifiers)){
          fail = true;
          document.querySelector("#" + actions[i] + "_letter").classList.add("dup_keybinds");
          document.querySelector("#" + actions[j] + "_letter").classList.add("dup_keybinds");
        }
      }
    }
  }
  
  if (!fail){
    browser.storage.local.set({ultrawidify_keybinds:new_keybinds});
  }
  
}

function saveAutoar(){
  console.log("saving autoar. is checked?", document.querySelector("#enable_autoar").checked)
  setopt({ultrawidify_autoar: document.querySelector("#enable_autoar").checked});
}

// setopt in getopt. Shranita oz. dobita stvari iz skladišča
// setopt, getopt. They set/get stuff from the storage

function setopt(item){
  browser.storage.local.set(item);
}
function getopt(prop, callback){
  browser.storage.local.get(prop).then(callback);
}

function compareModifiers(a,b){
  //NOTE: to je precej slab in neprenoslijv način primerjanja dveh tabel, ampak za naš primer deluje dovolj
  //      dobro, saj 'ctrl' vedno pride pred 'alt' in 'alt' vedno pride pred 'shift' (če se sploh pojavijo).
  //NOTE: this is bad and totally unfoolproof practice. In our example comparing arrays the way we do works
  //      because values ALWAYS appear in the same order: 'ctrl' always appears before 'alt' (or it doesn't
  //      appear at all). 'alt' always appears before 'shift' (or it doesn't appear at all). 
  if(a.length != b.length)
    return false;
  
  var match = true;
  for(var i = 0; i < a.length; i++)
    match &= a[i] == b[i]
  
  return match;
}

function printerr(err){
  console.log(err);
}

function gotopts(opts){
  var KEYBINDS = Object.keys(opts.ultrawidify_keybinds).map(function (key) { return opts.ultrawidify_keybinds[key];});

  var actions = ["fitw", "fith", "reset", "zoom", "unzoom", "ar219", "ar169", "ar1610", "ar43", "autoar"];
  for(var i = 0; i < actions.length; i++){
    document.querySelector("#" + actions[i] + "_letter").classList.remove("dup_keybinds");
    document.querySelector("#" + actions[i] + "_letter").value = KEYBINDS[i].key;
    for(var j = 0; j < KEYBINDS[i].modifiers.length; j++){
      if(KEYBINDS[i].modifiers[j] == "ctrl")
        document.querySelector("#" + actions[i] + "_ctrl").checked = true;
      if(KEYBINDS[i].modifiers[j] == "alt")
        document.querySelector("#" + actions[i] + "_alt").checked = true;
      if(KEYBINDS[i].modifiers[j] == "shift")
        document.querySelector("#" + actions[i] + "_shift").checked = true;
    }
  }
}

function loadopts(){
  var ask4keybinds = browser.storage.local.get("ultrawidify_keybinds");
  ask4keybinds.then(gotopts, printerr);
}


// page init

document.addEventListener("DOMContentLoaded", loadopts);

document.querySelector("#tab_shortcuts").addEventListener("click", showShortcuts);
document.querySelector("#tab_about").addEventListener("click", showAbout);
document.querySelector("#tab_general_settings").addEventListener("click",showGeneralSettings);

document.querySelector("#kb_save").addEventListener("click", saveopts);
document.querySelector("#kb_cancel").addEventListener("click",loadopts);

document.querySelector("#enable_autoar").addEventListener("click",saveAutoar);
getopt("ultrawidify_autoar",function(obj){console.log("obj:",obj);document.querySelector("#enable_autoar").checked = obj.ultrawidify_autoar});
