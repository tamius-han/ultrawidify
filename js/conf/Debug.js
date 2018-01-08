// Set prod to true when releasing
// _prod = true; 
// _prod = false;

Debug = {
  debug: true,
  keyboard: true,
  debugResizer: true,
  debugArDetect: true,
  debugStorage: true,
  showArDetectCanvas: false,
  flushStoredSettings: true
}

if(_prod){
  for(var key in Debug){
    Debug[key] = false;
  }
}

if(Debug.debug)
  console.log("Guess we're debugging ultrawidify then. Debug.js must always load first, and others must follow.\nLoading: Debug.js");
