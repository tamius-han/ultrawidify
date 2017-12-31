// blacklist - ban blacklist. 
// whitelist - ban all except whitelist 
// none -      ban all
var _ec_mode = "blacklist" 


var _ec_init = function() {
  
  if(Debug.debug){
    console.log("pls implement");
    console.log("this: ", this);
  }
}

ExtensionConf = {
  mode: _ec_mode,
  init: _ec_init
}
