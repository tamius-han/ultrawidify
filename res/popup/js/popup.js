if(Debug.debug)
  console.log("[popup.js] loading popup script!");

document.getElementById("uw-version").textContent = browser.runtime.getManifest().version;

var Menu = {};
Menu.noVideo    = document.getElementById("no-videos-display");
Menu.general    = document.getElementById("extension-mode");
Menu.arSettings = document.getElementById("aspect-ratio-settings");
Menu.cssHacks   = document.getElementById("css-hacks-settings");
Menu.about      = document.getElementById("panel-about");

var MenuTab = {};
MenuTab.general    = document.getElementById("_menu_general");
MenuTab.arSettings = document.getElementById("_menu_aspectratio");
MenuTab.cssHacks   = document.getElementById("_menu_hacks");
MenuTab.about      = document.getElementById("_menu_about");

var selectedMenu = "arSettings";
var hasVideos = false;

function check4videos(){
  var command = {};
  command.cmd = "has-videos";
  command.sender = "popup";
  command.receiver = "uwbg";
  
  browser.runtime.sendMessage(command)
  .then(response => {
    if(Debug.debug)
      console.log("[popup.js::check4videos] received response:",response);
    
    if(response.response.hasVideos){
      hasVideos = true;
      openMenu(selectedMenu);
    }
  })
  .catch(error => {
    if(Debug.debug)
      console.log("%c[popup.js::check4videos] sending message failed with error", "color: #f00", error, "%c retrying in 1s ...", "color: #f00");
    
    setTimeout(check4videos, 1000);
  });
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
    if(!hasVideos)
      Menu.noVideo.classList.remove("hidden");
    else{
      Menu[menu].classList.remove("hidden");
      if(Debug.debug){
        console.log("[popup.js::openMenu] unhid", menu, "| element: ", Menu[menu]);
      }
    }
  }
  else{
    Menu[menu].classList.remove("hidden");
    if(Debug.debug){
      console.log("[popup.js::openMenu] unhid", menu, "| element: ", Menu[menu]);
    }
  }
  
  if(menu != "noVideo"){
    selectedMenu = menu;
    MenuTab[menu].classList.add("selected");
  }
}


document.addEventListener("click", (e) => {
  
//   console.log("we clicked. e?",e);
  
  function getcmd(e){
//     console.log("extracting command from e", e);
    
    var command = {};
    command.sender = "popup";
    command.receiver = "uwbg";
    
    if(e.target.classList.contains("disabled"))
      return;
    
    if(e.target.classList.contains("menu-item")){
      if(e.target.classList.contains("_menu_general")){
        openMenu("general");
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
        return command;
      }
      if(e.target.classList.contains("_ar_reset")){
        command.cmd = "force-ar";
        command.newAr = "reset";
        return command;
      }
      if(e.target.classList.contains("_ar_219")){
        command.cmd = "force-ar";
        command.newAr = 2.39;
        return command;
      }
      if(e.target.classList.contains("_ar_189")){
        command.cmd = "force-ar";
        command.newAr = 2.0;
        return command;
      }
      if(e.target.classList.contains("_ar_169")){
        command.cmd = "force-ar";
        command.newAr = 1.78;
        return command;
      }
      if(e.target.classList.contains("_ar_1610")){
        command.cmd = "force-ar";
        command.newAr = 1.6;
        return command;
      }
    }
    
    if(e.target.classList.contains("_autoar")){
      if(e.target.classList.contains("_autoar_temp-disable")){
        return {cmd: "stop-autoar", sender: "popup", receiver: "uwbg"};
      }
      if(e.target.classList.contains("_autoar_disable")){
        return {cmd: "disable-autoar", sender: "popup", receiver: "uwbg"};
      }
      if(e.target.classList.contains("_autoar_enable")){
        return {cmd: "enable-autoar", sender: "popup", receiver: "uwbg"};
      }
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
  }
  
  var command = getcmd(e);  
  if(command)
    browser.runtime.sendMessage(command);
});



check4videos();
