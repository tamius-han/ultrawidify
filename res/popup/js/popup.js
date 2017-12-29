if(Debug.debug)
  console.log("[popup.js] loading popup script!");


async function test(){
  await StorageManager.getopt_async("uw-settings");
  console.log("popup: settings machine :b:roke?", Settings);
  
}

function changeAr(ar){
  if(Debug.debug)
    console.log("[popup.js] changing ar to ", ar)
}

test();

// browser.runtime.sendMessage("test");



document.addEventListener("click", (e) => {
  
  console.log("we clicked. e?",e);
  
  function getcmd(e){
    console.log("extracting command from e", e);
    
    var command = {};
    command.sender = "popup";
    command.receiver = "uwbg";
    
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
  console.log("command: ", command);
  browser.runtime.sendMessage(command);
});
