// Yeah hi /r/badcode.
// Anyway, because nazi localstorage flat out refuses to store arrays:

var DEFAULT_KEYBINDINGS = { 
  0:{ action: "fitw",
    key: 'w',
    modifiers: []
  },
  1:{
    action: "fith", 
    key: 'e',
    modifiers: []
  },
  2: {
    action: "reset",
    key: 'r',
    modifiers: []
  },
  3: {
    action: "zoom",
    key: "z",
    modifiers: []
  },
  4: {
    action: "unzoom",
    key: "u",
    modifiers: []
  },
  5: {
    action: "char",
    targetAR: (21/9),
    key: "d",
    modifiers: []
  },
  6: {
    action: "char",
    targetAR: (16/9),
    key: "s",
    modifiers: []
  },
  7: {
    action: "char",
    targetAR: (16/10),
    key: "x",
    modifiers: []
  },
  8: {
    action: "char",
    targetAR: (4/3),
    key: "c",
    modifiers: []
  },
  9: {
    action: "autoar",
    key: "a",
    modifiers: []
  }
};


// functions

var _kbd_setup = function() {
  StorageManager.getopt("keybinds");
  
}



var _kbd_setup_stage2 = function(){
  if(Debug.debug  || Debug.keyboard)
    console.log("uw::keydownSetup | starting keybord shortcut setup");
  $(document).keydown(function (event) {          // Tukaj ugotovimo, katero tipko smo pritisnili
    
    // Tipke upoštevamo samo, če smo v celozaslonskem načinu oz. če ne pišemo komentarja
    // v nasprotnem primeru ne naredimo nič.
    // We only take actions if we're in full screen or not writing a comment
    if( !(inFullScreen || (
      (document.activeElement.getAttribute("role") != "textbox") &&
      (document.activeElement.getAttribute("type") != "text")
    ))){
      if(Debug.debug  || Debug.keyboard)
        console.log("We're writing a comment or something. Doing nothing");
      return;
    }
    
    if(Debug.debug  || Debug.keyboard ){
      //       console.log(KEYBINDS);
      console.log("we pressed a key: ", event.key , " | keydown: ", event.keydown);
      if(event.key == 'p'){
        console.log("uw/keydown: attempting to send message")
        var sending = browser.runtime.sendMessage({
          type: "debug",
          message: "Test message, please ignore"
        });
        sending.then( function(){}, function(){console.log("uw/keydown: there was an error while sending a message")} );
        console.log("uw/keydown: test message sent! (probably)");
        return;
      }
    }
    
    for(i in KEYBINDS){
      if(Debug.debug  || Debug.keyboard)
        console.log("i: ", i, "keybinds[i]:", KEYBINDS[i]);
      
      if(event.key == KEYBINDS[i].key){
        if(Debug.debug  || Debug.keyboard)
          console.log("Key matches!");
        //Tipka se ujema. Preverimo še modifierje:
        //Key matches. Let's check if modifiers match, too:
        var mods = true;
        for(var j = 0; j < KEYBINDS[i].modifiers.length; j++){
          if(KEYBINDS[i].modifiers[j] == "ctrl")
            mods &= event.ctrlKey ;
          else if(KEYBINDS[i].modifiers[j] == "alt")
            mods &= event.altKey ;
          else if(KEYBINDS[i].modifiers[j] == "shift")
            mods &= event.shiftKey ;
        }
        if(Debug.debug  || Debug.keyboard)
          console.log("we pressed a key: ", event.key , " | mods match?", mods, "keybinding: ", KEYBINDS[i]);
        if(mods){
          event.stopPropagation();
          
          console.log("uw::keydown | keys match. Taking action.");
          if(KEYBINDS[i].action == "char"){
            changeCSS("char", KEYBINDS[i].targetAR);
            return;
          }
          if(KEYBINDS[i].action == "autoar"){
            manual_autoar();
            return;
          }
          changeCSS("anything goes", KEYBINDS[i].action);
          return;
        }
      }
    }
  });
  
  document.addEventListener("mozfullscreenchange", function( event ) {
    onFullScreenChange();
    inFullScreen = ( window.innerHeight == window.screen.height && window.innerWidth == window.screen.width);
    inFullScreen ? onFullscreenOn() : onFullscreenOff();
  });
}
