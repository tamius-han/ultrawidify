import Debug from '../conf/Debug';
import currentBrowser from '../conf/BrowserDetect';

class Logger {
  constructor(conf) {
    this.onLogEndCallbacks = [];
    this.history = [];
    this.globalHistory = {};
    this.isContentScript = false;
    this.isBackgroundScript = true;
  }

  static saveConfig(conf) {
    if (process.env.CHANNEL === 'dev') {
      console.info('Saving logger conf:', conf)
    }

    if (currentBrowser.firefox || currentBrowser.edge) {
      return browser.storage.local.set( {'uwLogger': JSON.stringify(conf)});
    } else if (currentBrowser.chrome) {
      return chrome.storage.local.set( {'uwLogger': JSON.stringify(conf)});
    }
  }

  static syncConfig(callback) {
    const br = currentBrowser.firefox ? browser : chrome;
    br.storage.onChanged.addListener( (changes, area) => {
      if (changes.uwLogger) {
        const newLoggerConf = JSON.parse(changes.uwLogger.newValue)
        if (process.env.CHANNEL === 'dev') {
          console.info('Logger settings reloaded. New conf:', conf);
        }
        callback(newLoggerConf);
      }
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

    if (process.env.CHANNEL === 'dev') {
      try {
        console.info("[Logger::getSaved] Got settings:", JSON.parse(ret.uwLogger));
      } catch (e) {
        console.info("[Logger::getSaved] No settings.")
      }
    }

    try {
      return JSON.parse(ret.uwLogger);
    } catch(e) {
      return {consoleOptions: {}, fileOptions: {}};
    }
  }

  async init(conf) {
    // this is the only property that always gets passed via conf
    // and doesn't get ignored even if the rest of the conf gets
    // loaded from browser storage
    if (conf.isContentScript) {
      this.isContentScript = true;
      this.isBackgroundScript = false;
    }

    if (conf && process.env.CHANNEL === 'dev' && !conf.useConfFromStorage) {
      this.conf = conf;
    } else {
      this.conf = await Logger.getConfig();
    }
    if (this.conf.consoleOptions === undefined) {
      this.conf.consoleOptions = {};
    }
    if (this.conf.fileOptions === undefined) {
      this.conf.fileOptions = {};
    }
    
    this.startTime = performance.now();
    this.temp_disable = false;
    this.stopTime = this.conf.timeout ? performance.now() + (this.conf.timeout * 1000) : undefined;

    const ths = this;
    const br = currentBrowser.firefox ? browser : chrome;

    br.storage.onChanged.addListener( (changes, area) => {
      if (process.env.CHANNEL === 'dev') {
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

  onLogEnd(callback) {
    this.onLogEndCallbacks.push(callback);
  }

  // this should be used mostly in background page instance of logger, btw
  addToGlobalHistory(key, log) {
    this.globalHistory[key] = log;
  }

  finish() {
    this.allowLogging = false;
    if (!this.isBackgroundScript) {
      const logJson = JSON.stringify(this.history);
      for(const f of this.onLogEndCallbacks) {
        f(logJson);
      }
    } else {
      this.globalHistory['uw-bg'] = this.history;
      return this.globalHistory;
    }
  }

  parseStack() {
    const trace = (new Error()).stack;

    const stackInfo = {};
    // we turn our stack into array and remove the "file::line" part of the trace,
    // since that is useless because minification/webpack
    stackInfo['stack'] = {trace: trace.split('\n').map(a => a.split('@')[0])};

    // here's possible sources that led to this log entry
    stackInfo['periodicPlayerCheck'] = false;
    stackInfo['periodicVideoStyleChangeCheck'] = false;
    stackInfo['aard'] = false;
    stackInfo['keyboard'] = false;
    stackInfo['popup'] = false;
    stackInfo['mousemove'] = false;

    // here we check which source triggered the action. We know that only one of these
    // functions will appear in the trace at most once (and if more than one of these
    // appears — e.g. frameCheck triggered by user toggling autodetection in popup —
    // the most recent one will be the correct one 99% of the time)
    for (const line of stackInfo.stack.trace) {
      if (line.startsWith('doPeriodicPlayerElementChangeCheck')) {
        stackInfo['periodicPlayerCheck'] = true;
        break;
      } else if (line.startsWith('doPeriodicFallbackChangeDetectionCheck')) {
        stackInfo['periodicVideoStyleChangeCheck'] = true;
        break;
      } else if (line.startsWith('frameCheck')) {
        stackInfo['aard'] = true;
        break;
      } else if (line.startsWith('execAction')) {
        stackInfo['keyboard'] = true;
        break;
      } else if (line.startsWith('processReceivedMessage')) {
        stackInfo['popup'] = true;
        break;
      } else if (line.startsWith('handleMouseMove')) {
        stackInfo['mousemove'] = true;
      }
    }

    return stackInfo;
  }

  // test for blacklisted origin
  isBlacklistedOrigin(stackInfo) {
    if (stackInfo.periodicPlayerCheck) {
      return !this.conf.allowBlacklistedOrigins?.periodicPlayerCheck;
    }
    if (stackInfo.periodicVideoStyleChangeCheck) {
      return !this.conf.allowBlacklistedOrigins?.periodicVideoStyleChangeCheck;
    }
    if (stackInfo.mousemove) {
      return !this.conf.allowBlacklistedOrigins?.handleMouseMove;
    }

    return false;
  }

  isTimeUp() {
    if (this.stopTime && performance.now() > this.stopTime) {
      if (this.conf.allowLogging) {
        this.log('force', 'debug', '-----[ alloted time has run out. logging will stop ]-----');
        this.finish();
      }
      return true;
    }
    return false;
  }

  // NOTE: THIS FUNCTION IS NEVER USED INTERNALLY!
  canLog(component) {
    if (!this.conf.allowLogging) {
      return false;
    }

    const stackInfo = this.parseStack();
    if (this.isBlacklistedOrigin(stackInfo)) {
      return false;
    }    

    // if either of these two is true, we allow logging to happen (forbidden origins were checked above)
    return (this.canLogFile(component) || this.canLogConsole(component));
  }

  canLogFile(component) {
    if (!this.conf.fileOptions.enabled || this.temp_disable) {
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
    if (!this.conf.consoleOptions?.enabled || this.temp_disable) {
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
  
  logToFile(message, stackInfo) {
    let ts = performance.now();
    if (ts <= this.history[this.history.length - 1]) {
      ts = this.history[this.history.length - 1] + 0.00001;
    }

    this.history.push({
      ts: ts,
      message: JSON.stringify(message),
      stack: stackInfo,
    })
  }

  logToConsole(message, stackInfo) {
    console.log(...message, {stack: stackInfo});
  }

  // level is unused as of now, but this may change in the future
  // levels: 'info', 'warn', 'error'.
  // if level is `true` (bool), logging happens regardless of any other
  // settings
  log(level, component, ...message) {
    if (!this.conf || !this.conf.allowLogging) {
      return;
    }
    const stackInfo = this.parseStack();
    
    // skip all checks if we force log
    if (level === 'force') {
      if (this.conf.fileOptions.enabled) {
        this.logToFile(message, stackInfo);
      }
      if (this.conf.consoleOptions.enabled) {
        this.logToConsole(message, stackInfo);
      }
      return; // don't check further — recursion-land ahead!
    }

    if (this.isTimeUp()) {
      return;
    }

    // don't log stuff from blacklisted origin (unless logger conf says otherwise)
    if (this.isBlacklistedOrigin(stackInfo)) {
      return;
    }
    
    if (this.conf.fileOptions.enabled) {
      if (this.canLogFile(component)) {
        this.logToFile(message, stackInfo);
      }
    }
    if (this.conf.consoleOptions.enabled) {
      if (this.canLogConsole(component)) {
        this.logToConsole(message, stackInfo);
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
