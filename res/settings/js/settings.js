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
