class IO {
  static async exportStringToFile(jsonString) {
    console.info("\n\n\n\n---------- Starting export of log to file ----------------");

    console.info("[info] json string for exportObject:", jsonString.length);

    const blob = new Blob([jsonString], {type: 'application/json'});

    console.info("[ ok ] Blob created");

    const fileUrl = URL.createObjectURL(blob);

    console.info("[ ok ] fileUrl created");

    try {
      console.log("[info] inside try/catch block. BrowserDetect:", currentBrowser);
      if (currentBrowser.firefox) {
        console.info("[info] we are using firefox");
        await browser.permissions.request({permissions: ['downloads']});
        console.info("[ ok ] download permissions ok");
        browser.downloads.download({saveAs: true, filename: 'extension-log.json', url: fileUrl});
      } else if (currentBrowser.chrome) {
        console.info("[info] we are using chrome");

        const ths = this;
        
        chrome.permissions.request(
          {permissions: ['downloads']},
          (granted) => {
            if (granted) {
              chrome.downloads.download({saveAs: true, filename: 'extension-log.json', url: fileUrl});
            } else {
              ths.downloadPermissionError = true
            }
          } 
        )
      }
      this.globalHistory = {};
      this.history = [];
    } catch (e) {
      console.error("[fail] error while saving file.", e);
      this.downloadPermissionError = true;
    }
  }
}

export default IO;
