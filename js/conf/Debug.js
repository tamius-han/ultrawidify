// Set prod to true when releasing
_prod = true; 
// _prod = false; 

Debug = {
  init: true,
  debug: false,
  keyboard: true,
  debugResizer: true,
  debugArDetect: true,
  debugStorage: false,
  comms: false,
  // showArDetectCanvas: true,
  flushStoredSettings: true,
  // flushStoredSettings: false,
  playerDetectDebug: true,
  periodic: true,
  videoRescan: true,
  arDetect: {
    edgeDetect: true
  },
  canvas: {
    debugDetection: true
  },
  debugCanvas: {
    // enabled: true,
    // guardLine: true
    enabled: false,
    guardLine: false
  }
}

if(_prod){
  __disableAllDebug(Debug);
}

function __disableAllDebug(obj) {
  for(key in obj) {
    if (obj.hasOwnProperty(key) ){
      if(obj[key] instanceof Object)
        __disableAllDebug(obj[key]);
      else
        obj[key] = false;
    }
  }
}

if(Debug.debug)
  console.log("Guess we're debugging ultrawidify then. Debug.js must always load first, and others must follow.\nLoading: Debug.js");
