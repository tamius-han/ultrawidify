import Debug from '../conf/Debug';
import currentBrowser from '../conf/BrowserDetect';

class Logger {
  constructor(conf) {
  }

  static saveConfig(conf) {
    if (currentBrowser.firefox || currentBrowser.edge) {
      return browser.storage.local.set( {'uwLogger': JSON.stringify(conf)});
    } else if (currentBrowser.chrome) {
      return chrome.storage.local.set( {'uwLogger': JSON.stringify(conf)});
    }
  }

  static syncConfig(callback) {
    const br = currentBrowser.firefox ? browser : chrome;
    br.storage.onChanged.addListener( (changes, area) => {
      callback(JSON.parse(changes.uwLogger.newValue));
    });
  }

  static async getConfig() {
    let ret;

    if (currentBrowser.firefox) {
      ret = await browser.storage.local.get('uwLogger');
    } else if (currentBrowser.chrome) {
      ret = await new Promise( (resolve, reject) => {
        chrome.storage.local.get('uwLogger', (res) => resolve(res));
      });
    } else if (currentBrowser.edge) {
      ret = await new Promise( (resolve, reject) => {
        browser.storage.local.get('uwLogger', (res) => resolve(res));
      });
    }

    if (Debug.debug && Debug.debugStorage) {
      try {
        console.log("[Logger::getSaved] Got settings:", JSON.parse(ret.uwLogger));
      } catch (e) {
        console.log("[Logger::getSaved] No settings.")
      }
    }

    try {
      return JSON.parse(ret.uwLogger);
    } catch(e) {
      return {logToFile: false, logToConsole: false, consoleOptions: {}, fileOptions: {}};
    }
  }

  async init(conf) {
    if (conf && process.env.CHANNEL === 'dev') {
      this.conf = conf;
    } else {
      this.conf = await Logger.getConfig();
    }
    if (this.conf.consoleOptions === undefined) {
      this.conf.consoleOptions = {};
    }
    if (!this.conf.fileOptions === undefined) {
      this.conf.fileOptions = {};
    }
    // this is the only property that always gets passed via conf
    // and doesn't get ignored even if the rest of the conf gets
    // loaded from browser storage
    this.isBackgroundPage = !!conf.isBackgroundPage;
    this.history = [];
    this.globalHistory = {};
    this.startTime = performance.now();
    this.temp_disable = false;
    this.stopTime = conf.timeout ? performance.now() + (conf.timeout * 1000) : undefined;

    const ths = this;
    const br = currentBrowser.firefox ? browser : chrome;
    br.storage.onChanged.addListener( (changes, area) => {
      if (Debug.debug && Debug.debugStorage) {
        console.log("[Logger::<storage/on change>] Settings have been changed outside of here. Updating active settings. Changes:", changes, "storage area:", area);
        if (changes['uwLogger'] && changes['uwLogger'].newValue) {
          console.log("[Logger::<storage/on change>] new settings object:", JSON.parse(changes.uwLogger.newValue));
        }
      }
      if(changes['uwLogger'] && changes['uwLogger'].newValue) {
        ths.conf = JSON.parse(changes.uwLogger.newValue);
      }
    });

  }


  clear() {
    this.log = [];
    this.startTime = performance.now();
    this.stopTime = this.conf.timeout ? performance.now() + (this.conf.timeout * 1000) : undefined;
  }

  setConf(conf) {
    this.conf = conf;  // effective immediately
    // also persist settings:
    Logger.saveConfig(conf);
  }

  async getSaved() {
    return Logger.getSaved();    
  }


  // allow syncing of start times between bg and page scripts.
  // may result in negative times in the log file, but that doesn't 
  // really matter
  getStartTime() {
    return this.startTime;
  }
  setStartTime(startTime) {
    if (startTime) {
      this.startTime = startTime;
    } else {
      this.startTime = performance.now();
    }
  }

  // getLogFileString() {
  //   let logfileStr = '';
  //   let logTs = '';       // number of seconds since extension started on a given page¸
  //   for (let i = 0; i < this.history.length; i++) {
  //     logTs = ((this.history[i].ts - Math.floor(this.performance.now)) / 3).toFixed(3);
  //     logfileStr = `${logfileStr}[@${logTs}] -- ${this.history[i].message}\n`
  //   }

  //   return logfileStr;
  // }
  getFileLogJSONString() {
    return {
      site: window && window.location,
      log: JSON.toString(this.history),
    }
  }

  pause() {
    this.temp_disable = true;
  }
  resume() {
    this.temp_disable = false;
  }

  canLog(component) {
    return this.conf.allowLogging && (this.canLogFile(component) || this.canLogConsole(component));
  }

  canLogFile(component) {
    if (!this.conf.fileOptions.enabled || this.temp_disable) {
      return false;
    }
    if (performance.now() > this.stopTime) {
      this.conf.allowLogging = false;
      return false;
    }
    if (Array.isArray(component) && component.length ) {
      for (const c of component) {
        if (this.conf.fileOptions[c]) {
          return this.conf.fileOptions[c];
        }
      }
    } else {
      return this.conf.fileOptions[component];
    }
  }
  canLogConsole(component) {
    if (!this.conf.consoleOptions.enabled || this.temp_disable) {
      return false;
    }
    if (performance.now() > this.stopTime) {
      this.conf.allowLogging = false;
      return false;
    }
    if (Array.isArray(component) && component.length) {
      for (const c of component) {
        if (this.conf.consoleOptions[c]) {
          return this.conf.consoleOptions[c];
        }
      }
    } else {
      return this.conf.consoleOptions[component] !== undefined ? this.conf.consoleOptions[component] : this.conf.logAll;
    }

    return this.conf.logAll;
  }

  // level is unused as of now, but this may change in the future
  // levels: 'info', 'warn', 'error'
  log(level, component, ...message) {
    if (!this.conf) {
      return;
    }
    const error = new Error();
    if (this.conf.logToFile) {
      if (this.canLogFile(component)) {
        let ts = performance.now();
        if (ts <= this.history[this.history.length - 1]) {
          ts = this.history[this.history.length - 1] + 0.00001;
        }

        this.history.push({
          ts: ts,
          message: JSON.stringify(message),
          stack: error.stack,
        })
      }
    }
    if (this.conf.logToConsole) {
      if (this.canLogConsole(component)) {
        console.log(...message, error.stack);
      }
    }
  }

  // leaves a noticeable mark in the file log at the time it got triggered, as well as
  // at the intervals of 1s and .5s before the trigger moment
  cahen() {
    if (this.conf.logToFile) {
      let ts = performance.now();
      let secondMark = ts - 1000;
      let halfSecondMark = ts - 500;
      let i = this.history.length();

      // correct ts _after_ secondMark and halfSecondMark were determined
      if (ts <= this.history[this.history.length - 1]) {
        ts = this.history[this.history.length - 1] + 0.00001;
      }

      this.history.push({
        ts: ts,
        message: "-------------------------------------- CAHEN --------------------------------------"
      });

      // find the spot for the half second mark. In this case, we don't really particularly care whether timestamps 
      // are duped due to cahen warnings
      while (this.history[i--].ts > halfSecondMark) {}
      this.history.push({
        ts: halfSecondMark,
        message: "-------------------------------------- 0.5s to CAHEN --------------------------------------"
      });

      // repeat for one second warning
      while (this.history[i--].ts > secondMark) {}
      this.history.push({
        ts: secondMark,
        message: "-------------------------------------- 1s to CAHEN --------------------------------------"
      });
    }
  }

  addLogFromPage(host, tabId, frameId, pageHistory) {
    if (! this.globalHistory[host]) {
      this.globalHistory[host] = {};
    }
    if (! this.globalHistory[tabId || 'tab']) {
      this.globalHistory[host][tabId || 'tab'] = {};
    }
    if (!this.globalHistory[frameId || 'top']) {
      this.globalHistory[host][tabId || 'tab'][frameId || 'top'] = pageHistory;
    } else {
      this.globalHistory[host][tabId || 'tab'][frameId || 'top'].push(...pageHistory);
    }
  }

  // export log file — only works on background page
  async exportLogToFile() {
    const exportObject = {'pageLogs': JSON.parse(JSON.stringify({...this.globalHistory}))};
    exportObject['logger-settings'] = this.conf.fileOptions;
    exportObject['backgroundLog'] = JSON.parse(JSON.stringify(this.history));
    exportObject['popupLog'] = 'NOT IMPLEMENTED';

    const blob = new Blob([JSON.stringify(exportObject)], {type: 'application/json'});
    const fileUrl = URL.createObjectURL(blob);

    try {
      if (BrowserDetect.firefox) {
        await browser.permissions.request({permissions: ['downloads']});
        browser.downloads.download({saveAs: true, filename: 'extension-log.json', url: fileUrl});
      } else if (BrowserDetect.chrome) {
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
      this.downloadPermissionError = true;
    }
  }

  // used for instances where logging is limited to a single page and is timed
  addLogAndExport(host, pageHistory) {
    this.globalHistory = {};
    this.globalHistory[host || 'no-host-provided'] = pageHistory;
    this.exportLogToFile();
  }
}

export default Logger;
