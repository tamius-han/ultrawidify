class IO {
  /**
   * Export a (presumably json) string to file. Meant for use with content script.
   * @param {*} jsonString string to be saved
   */
  static async csStringToFile(jsonString) {
    console.info("\n\n\n\n---------- Starting export of log to file ----------------");

    console.info("[info] json string for exportObject:", jsonString.length);

    const blob = new Blob([jsonString], {type: 'application/json'});
    const fileUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = fileUrl;
    a.download = 'ultrawidify-log.log';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(fileUrl);
  }
}

export default IO;
