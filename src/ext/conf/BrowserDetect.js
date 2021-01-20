import browser from "vuex-webextensions/dist/browser";

if (process.env.CHANNEL !== 'stable') {
  console.info('Loaded BrowserDetect');
}

function detectEdgeUA() {
  return /Edg\/(\.?[0-9]*)*$/.test(window.navigator.userAgent);
}

function getBrowserObj() {
  return process.env.BROWSER === 'firefox' ? browser : chrome;
}

function getRuntime() {
  return process.env.BROWSER === 'firefox' ? browser.runtime : chrome.runtime;
}

function getURL(url) {
  return process.env.BROWSER === 'firefox' ? browser.runtime.getURL(url) : chrome.runtime.getURL(url);
}

const BrowserDetect = {
  firefox: process.env.BROWSER === 'firefox',
  anyChromium: process.env.BROWSER !== 'firefox',
  chrome: process.env.BROWSER === 'chrome',
  edge: process.env.BROWSER === 'edge',
  processEnvBrowser: process.env.BROWSER,
  processEnvChannel: process.env.CHANNEL,
  isEdgeUA: detectEdgeUA(),
  browserObj: getBrowserObj(),
  runtime: getRuntime(),
  getURL: (url) => getURL(url),
} 

if (process.env.CHANNEL !== 'stable') {
  console.info("BrowserDetect loaded:\n\nprocess.env.BROWSER:", process.env.BROWSER, "\nExporting BrowserDetect:", BrowserDetect);
}

export default BrowserDetect;