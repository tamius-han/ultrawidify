if(Debug.debug)
  console.log("[settings.js] loading settings script!");

// document.getElementById("uw-version").textContent = browser.runtime.getManifest().version;

var settings = new Settings(undefined, () => updateConfig());

function updateConfig() {
  loadConfig();
}

function loadConfig() {
  loadActions();
}






// setup:

async function initSettings() {
  await settings.init();
  loadConfig();
}

initSettings();