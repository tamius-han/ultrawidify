// Yeah hi /r/badcode.
// Anyway, because nazi localstorage flat out refuses to store arrays:

var DEFAULT_KEYBINDINGS = [
  { action: "fitw",
    key: 'w',
    modifiers: []
  },
  {
    action: "fith", 
    key: 'e',
    modifiers: []
  },
  {
    action: "reset",
    key: 'r',
    modifiers: []
  },
  {
    action: "zoom",
    key: "z",
    modifiers: []
  },
  {
    action: "unzoom",
    key: "u",
    modifiers: []
  },
  {
    action: "char",
    targetAR: (21/9),
    key: "d",
    modifiers: []
  },
  {
    action: "char",
    targetAR: (16/9),
    key: "s",
    modifiers: []
  },
  {
    action: "char",
    targetAR: (16/10),
    key: "x",
    modifiers: []
  },
  {
    action: "char",
    targetAR: (4/3),
    key: "c",
    modifiers: []
  },
  {
    action: "autoar",
    key: "a",
    modifiers: []
  }
];


// functions

var _kbd_callback = function(keys) {
  if (keys === null || keys === {} || keys === [] || keys == ""){
    StorageManager.setopt( {"keybinds": DEFAULT_KEYBINDINGS} );
    keys = DEFAULT_KEYBINDINGS;
  }
  
  _kbd_setup_apply(keys);
}

var _kbd_setup_init = function() {
  return StorageManager.getopt("keybinds", _kbd_callback);
}



var _kbd_setup_apply = function(keybinds){
  
  if(Debug.debug  || Debug.keyboard)
    console.log("uw::keydownSetup | starting keybord shortcut setup");
  $(document).keydown(function (event) {          // Tukaj ugotovimo, katero tipko smo pritisnili
    
    // Tipke upoštevamo samo, če smo v celozaslonskem načinu oz. če ne pišemo komentarja
    // v nasprotnem primeru ne naredimo nič.
    // We only take actions if we're in full screen or not writing a comment
    if( !(FullScreenDetect.isFullScreen() || (
      (document.activeElement.getAttribute("role") != "textbox") &&
      (document.activeElement.getAttribute("type") != "text")
    ))){
      if(Debug.debug  || Debug.keyboard)
        console.log("We're writing a comment or something. Doing nothing");
      return;
    }
    
    if(Debug.debug  || Debug.keyboard ){
      //       console.log(keybinds);
      console.log("we pressed a key: ", event.key , " | keydown: ", event.keydown);
      if(event.key == 'p'){
        console.log("uw/keydown: attempting to send message")
        var sending = browser.runtime.sendMessage({
          type: "debug",
          message: "Test message, please ignore"
        });
        sending.then( function(){}, function(){console.log("uw/keydown: there was an error while sending a message")} );
        console.log("uw/keydown: test message sent! (probably)");
//         return;
      }
    }
    
    for(i in keybinds){
      if(Debug.debug  || Debug.keyboard)
        console.log("i: ", i, "keybinds[i]:", keybinds[i]);
      
      if(event.key == keybinds[i].key){
        if(Debug.debug  || Debug.keyboard)
          console.log("Key matches!");
        //Tipka se ujema. Preverimo še modifierje:
        //Key matches. Let's check if modifiers match, too:
        var mods = true;
        for(var j = 0; j < keybinds[i].modifiers.length; j++){
          if(keybinds[i].modifiers[j] == "ctrl")
            mods &= event.ctrlKey ;
          else if(keybinds[i].modifiers[j] == "alt")
            mods &= event.altKey ;
          else if(keybinds[i].modifiers[j] == "shift")
            mods &= event.shiftKey ;
        }
        if(Debug.debug  || Debug.keyboard)
          console.log("we pressed a key: ", event.key , " | mods match?", mods, "keybinding: ", keybinds[i]);
        if(mods){
          event.stopPropagation();
          
          console.log("uw::keydown | keys match. Taking action.");
          if(keybinds[i].action == "char"){
            Status.arStrat = "fixed";
            Status["lastAr"] = keybinds[i].targetAR;
            Resizer.setAr(keybinds[i].targetAR);
            return;
          }
          if(keybinds[i].action == "autoar"){
            Status.arStrat = "auto";
            return;
          }
//           changeCSS("anything goes", keybinds[i].action);
          Status.arStrat = keybinds[i].action;
          Resizer.legacyAr(keybinds[i].action);
          return;
        }
      }
    }
  });
  
//   document.addEventListener("mozfullscreenchange", function( event ) {
//     onFullScreenChange();
//     inFullScreen = ( window.innerHeight == window.screen.height && window.innerWidth == window.screen.width);
//     inFullScreen ? onFullscreenOn() : onFullscreenOff();
//   });
}
// _kbd_setup_stage2();
// _kbd_setup_init();

var Keybinds = {
  init: _kbd_setup_init,
  apply: _kbd_setup_apply
}
