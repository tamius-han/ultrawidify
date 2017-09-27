// Extension settings are in this file. Site configuration is in Sites.js
// todo: move keybinds here

if(Debug.debug)
  console.log("Loading: Settings.js");

Settings = {
  arDetect: {
    enabled: "global",
    allowedMisaligned: 0.01,  // top and bottom letterbox thickness can differ by this much. Any more and we don't adjust ar.
    allowedArVariance: 0.025, // % by which old ar can differ from the new
    blacklist: [],            // banned on enabled: "global" 
    whitelist: []             // enabled on enabled: "whitelist-only", disabled on "disabled"
  },
  arChange: {
    samenessTreshold: 0.025,  // if aspect ratios are within 2.5% within each other, don't resize
  },
  miscFullscreenSettings: {
    videoFloat: "center",
  }
}
