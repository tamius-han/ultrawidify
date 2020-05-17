if (process.env.CHANNEL !== 'stable') {
  console.log('Loaded BrowserDetect');
}


const BrowserDetect = {
  firefox: process.env.BROWSER === 'firefox',
  chrome: process.env.BROWSER === 'chrome',
  edge: process.env.BROWSER === 'edge',
  processEnvBrowser: process.env.BROWSER,
  processEnvChannel: process.env.CHANNEL,
} 

if (process.env.CHANNEL !== 'stable') {
  console.log("Loading: BrowserDetect.js\n\nprocess.env.BROWSER:", process.env.BROWSER, "Exporting BrowserDetect:", BrowserDetect);
}

export default BrowserDetect;