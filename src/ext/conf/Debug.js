if (process.env.CHANNEL !== 'stable') {
  console.log('We are not on stable channel. File init will be printed to console.');
  console.log('Loaded Debug.js');
}

// Set prod to true when releasing
// const _prod = true; 
const _prod = false; 

var Debug = {
  // performanceMetrics: true, // should not be affected by debug.debug in order to allow benchmarking of the impact logging in console has
  // init: true,
  // debug: true,
  // keyboard: true,
  // resizer: true,
  // debugArDetect: true,
  // scaler: true,
  // debugStorage: true,
  // comms: true,
  // showArDetectCanvas: true,
  // flushStoredSettings: true,
  // playerDetect: true,
  // periodic: true,
  // videoRescan: true,
  // mousemove: true,
  // arDetect: {
    // edgeDetect: true
  // },
  // canvas: {
    // debugDetection: true
  // },
  debugCanvas: {
    // enabled: true,
    // guardLine: true
    // enabled: false,
    // guardLine: false
  }
}

if(_prod){
  __disableAllDebug(Debug);
}

function __disableAllDebug(obj) {
  for(let key in obj) {
    if (obj.hasOwnProperty(key) ){
      if(obj[key] instanceof Object) {
        __disableAllDebug(obj[key]);
      }
      else {
        obj[key] = false;
      }
    }
  }
}

if(Debug.debug)
  console.log("Guess we're debugging ultrawidify then. Debug.js must always load first, and others must follow.\nLoading: Debug.js");



export default Debug;