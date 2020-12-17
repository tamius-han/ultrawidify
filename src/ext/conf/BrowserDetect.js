if (process.env.CHANNEL !== 'stable') {
  console.info('Loaded BrowserDetect');
}


const BrowserDetect = {
  firefox: process.env.BROWSER === 'firefox',
  chrome: process.env.BROWSER === 'chrome',
  edge: process.env.BROWSER === 'edge',
  processEnvBrowser: process.env.BROWSER,
  processEnvChannel: process.env.CHANNEL,
} 

if (process.env.CHANNEL !== 'stable') {
  console.info("BrowserDetect loaded:\n\nprocess.env.BROWSER:", process.env.BROWSER, "\nExporting BrowserDetect:", BrowserDetect);
}

export default BrowserDetect;