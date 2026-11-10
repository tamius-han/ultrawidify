/**
 * NOTE: we cannot get rid of this js file. I tried for 30 seconds and I couldn't get
 * extension to work unless I kept this part of extension out of the ts file.
 */

import UWServer from '@src/ext/UWServer';

var BgVars = {
  arIsActive: true,
  hasVideos: false,
  currentSite: ""
}

const server = new UWServer();

// is semver a < b
const isSemverLess = (a, b) => {
  console.log('comparing semver:', a, b)
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal < bVal) return true;
    if (aVal > bVal) return false;
  }
  return false;
};

// add update listener
chrome.runtime.onInstalled.addListener(async (details) => {
  const lastVersionStorage = await chrome.storage.local.get('uw-last-updated-version');
  const lastVersion = lastVersionStorage['uw-last-updated-version'] || '0.0.0';
  const currentVersion = chrome.runtime.getManifest().version;

  let showUpdatePage = false;
  if (
    !lastVersion ||
    isSemverLess(lastVersion, '7.0.0')  // show update page if last version is less than this
  ) {
    showUpdatePage = true;
  }


  let hash;

  if (details.reason === "install") {
    hash = "installed";
    showUpdatePage = true; // always show page on install
  } else if (details.reason === "update") {
    hash = "updated";
  } else {
    return; // "chrome_update", "shared_module_update"
  }

  chrome.storage.local.set({'uw-last-updated-version': currentVersion});

  if (showUpdatePage) {
    chrome.tabs.create({
      url: chrome.runtime.getURL(`ui/pages/settings/index.html#${hash}`)
    });
  }
});
