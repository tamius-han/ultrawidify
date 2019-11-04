import Debug from './Debug.js';

const BrowserDetect = {
  firefox: process.env.BROWSER === 'firefox',
  chrome: process.env.BROWSER === 'chrome',
  edge: process.env.BROWSER === 'edge',
  processEnvBrowser: process.env.BROWSER,
} 

if (Debug.debug) {
  console.log("Loading: BrowserDetect.js\n\nprocess.env.BROWSER:", process.env.BROWSER, "Exporting BrowserDetect:", BrowserDetect);
}

export default BrowserDetect;