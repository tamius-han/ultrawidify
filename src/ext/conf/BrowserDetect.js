import browser from "vuex-webextensions/dist/browser";

if (process.env.CHANNEL !== 'stable') {
  console.info('Loaded BrowserDetect');
}


const BrowserDetect = {
  firefox: process.env.BROWSER === 'firefox',
  chrome: process.env.BROWSER === 'chrome',
  edge: process.env.BROWSER === 'edge',
  processEnvBrowser: process.env.BROWSER,
  processEnvChannel: process.env.CHANNEL,
  isEdgeUA: () => /Edg\/(\.?[0-9]*)*$/.test(window.navigator.userAgent),
  getBrowserObj: () => { return process.env.BROWSER === 'firefox' ? browser : chrome; },
  getURL: (url) => { console.log('getting file:', url); console.log(process.env.BROWSER === 'firefox' ? browser.runtime.getURL(url) : chrome.runtime.getURL(url)); return process.env.BROWSER === 'firefox' ? browser.runtime.getURL(url) : chrome.runtime.getURL(url); },
} 

if (process.env.CHANNEL !== 'stable') {
  console.info("BrowserDetect loaded:\n\nprocess.env.BROWSER:", process.env.BROWSER, "\nExporting BrowserDetect:", BrowserDetect);
}

export default BrowserDetect;