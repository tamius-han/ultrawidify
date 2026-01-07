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

// add update listener
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "update") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("ui/pages/settings/index.html#updated")
    });
  }
});
