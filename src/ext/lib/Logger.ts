import { decycle } from 'json-cyclic';
import Comms from './comms/Comms';
import BrowserDetect from '../conf/BrowserDetect';
import { browser } from 'webextension-polyfill-ts';

if (process.env.CHANNEL !== 'stable'){
  console.info('Loading Logger');
}


export const baseLoggingOptions: LoggerConfig = {
  isContentScript: true,
  allowLogging: false,
  useConfFromStorage: true,
  fileOptions: {
    enabled: false
  },
  consoleOptions: {
    "enabled": false,
    "debug": true,
    "init": true,
    "settings": true,
    "keyboard": true,
    "mousemove": false,
    "actionHandler": true,
    "comms": true,
    "playerDetect": true,
    "resizer": true,
    "scaler": true,
    "stretcher": true,
    "videoRescan": false,
    "playerRescan": false,
    "arDetect": true,
    "arDetect_verbose": false
  },
  allowBlacklistedOrigins: {
    'periodicPlayerCheck': false,
    'periodicVideoStyleChangeCheck': false,
    'handleMouseMove': false
  }
};

export interface LoggingOptions {
  enabled?: boolean;
  debug?: boolean;
  init?: boolean;
  settings?: boolean;
  keyboard?: boolean;
  mousemove?: boolean;
  actionHandler?: boolean;
  comms?: boolean;
  playerDetect?: boolean;
  resizer?: boolean;
  scaler?: boolean;
  stretcher?: boolean;
  videoRescan?: boolean;
  playerRescan?: boolean;
  arDetect?: boolean;
  arDetect_verbose?: boolean;
}

export interface LoggerBlacklistedOrigins {
  periodicPlayerCheck?: boolean;
  periodicVideoStyleChangeCheck?: boolean;
  handleMouseMove?: boolean;
}

export interface LoggerConfig {
  isContentScript?: boolean;
  isBackgroundScript?: boolean;
  allowLogging?: boolean;
  useConfFromStorage?: boolean;
  fileOptions?: LoggingOptions;
  consoleOptions?: LoggingOptions;
  allowBlacklistedOrigins?: LoggerBlacklistedOrigins;
}

class Logger {
  temp_disable: boolean = false;
  onLogEndCallbacks: any[] = [];
  history: any[] = [];
  globalHistory: any = {};
  isContentScript: boolean = false;
  isBackgroundScript: boolean = true;
  vuexStore: any;
  uwInstance: any;
  conf: any;
  startTime: number;
  stopTime: number;

  constructor(options?: {vuexStore?: any, uwInstance?: any}) {
    this.vuexStore = options?.vuexStore;
    this.uwInstance = options?.uwInstance;

    browser.storage.onChanged.addListener((changes, area) => {
      this.storageChangeListener(changes, area)
    });
  }

  static saveConfig(conf: LoggerConfig) {
    if (process.env.CHANNEL === 'dev') {
      console.info('Saving logger conf:', conf)
    }

    browser.storage.local.set( {'uwLogger': JSON.stringify(conf)});
  }

  static syncConfig(callback: (x) => void) {
    browser.storage.onChanged.addListener( (changes, area) => {
      if (changes.uwLogger) {
        const newLoggerConf = JSON.parse(changes.uwLogger.newValue)
        if (process.env.CHANNEL === 'dev') {
          console.info('Logger settings reloaded. New conf:', newLoggerConf);
        }
        callback(newLoggerConf);
      }
    });
  }

  static async getConfig() {
    let ret;

    // if (BrowserDetect.firefox) {
      ret = await browser.storage.local.get('uwLogger');
    // } else if (BrowserDetect.anyChromium) {
    //   ret = await new Promise( (resolve, reject) => {
    //     browser.storage.local.get('uwLogger', (res) => resolve(res));
    //   });
    // }

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

  async init(conf: LoggerConfig) {
    // this is the only property that always gets passed via conf
    // and doesn't get ignored even if the rest of the conf gets
    // loaded from browser storage
    if (conf.isContentScript) {
      this.isContentScript = true;
      this.isBackgroundScript = false;
    } else if (conf.isBackgroundScript) {
      this.isContentScript = false;
      this.isBackgroundScript = true;
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

    browser.storage.onChanged.addListener( (changes, area) => {
      if (process.env.CHANNEL === 'dev') {
        if (!changes.uwLogger) {
          // console.info('[Logger::<storage/on change> No new logger settings!');
        }
        if (changes['uwLogger'] && changes['uwLogger'].newValue) {
          // console.log("[Logger::<storage/on change>] Logger have been changed outside of here. Updating active settings. Changes:", changes, "storage area:", area);
          // console.info("[Logger::<storage/on change>] new logger settings object (parsed):", JSON.parse(changes.uwLogger.newValue));
        }
      }
      if (!changes['uwLogger']) {
        return;
      }
      if (changes['uwLogger']?.newValue) {
        const newConf = JSON.parse(changes.uwLogger.newValue);
        if (this.isContentScript && this.conf.allowLogging && !newConf.allowLogging) {
          this.saveToVuex();
        }
        this.conf = newConf;
      }
    });
  }

  storageChangeListener(changes, area) {
    if (!changes.uwLogger) {
      console.info('We dont have any logging settings, not processing frther');
      return;
    }

    try {
      this.conf = JSON.parse(changes.uwLogger.newValue);
    } catch (e) {
      console.warn('[uwLogger] Error while trying to parse new conf for logger:', e, '\nWe received the following changes:', changes, 'for area:', area);
    }

    // This code can only execute if user tried to enable or disable logging
    // through the popup. In cases like this, we do not gate the console.log
    // behind a check, since we _always_ want to have this feedback in response
    // to an action.
    console.info(
      '[uwLogger] logger config changed! New configuration:',
      this.conf, '\nraw changes:', changes, 'area?', area,
      '\n————————————————————————————————————————————————————————————————————————\n\n\n\n\n\n\n\n\n\n\n\n-----\nLogging with new settings starts now.'
    );

    // initiate loger if need be
    if (!this.startTime) {
      this.init(this.conf);
    }
  }

  setVuexStore(store) {
    this.vuexStore = store;
  }

  clear() {
    this.history = [];
    this.startTime = performance.now();
    this.stopTime = this.conf.timeout ? performance.now() + (this.conf.timeout * 1000) : undefined;
  }

  setConf(conf) {
    this.conf = conf;  // effective immediately
    // also persist settings:
    Logger.saveConfig(conf);
  }

  // async getSaved() {
  //   return Logger.getSaved();
  // }


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
      log: JSON.stringify(this.history),
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
  //
  addToGlobalHistory(key, log) {
    this.globalHistory[key] = log;
    this.log('info', 'debug', 'Added log for', key, 'to global history. Current history:', this.globalHistory);
  }

  finish() {
    if (!this.isBackgroundScript) {
      this.conf.allowLogging = false;
      // const logJson = JSON.stringify(decycle(this.history));
      // this.log('force', 'debugr', 'Calling all log end callbacks. There\'s this many of them:', 1);
      // for(const f of this.onLogEndCallbacks) {
      //   f(logJson);
      // }
    // } else {
      // this.exportLogToFile();
    }
    this.saveViaBgScript();
  }

  parseStack() {
    const trace = (new Error()).stack;

    const stackInfo: any = {};
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
    stackInfo['exitLogs'] = false;

    // here we check which source triggered the action. There can be more
    // than one source, too, so we don't break when we find the first one
    for (const line of stackInfo.stack.trace) {
      if (line === 'doPeriodicPlayerElementChangeCheck') {
        stackInfo['periodicPlayerCheck'] = true;
      } else if (line === 'doPeriodicFallbackChangeDetectionCheck') {
        stackInfo['periodicVideoStyleChangeCheck'] = true;
      } else if (line === 'frameCheck') {
        stackInfo['aard'] = true;
      } else if (line === 'execAction') {
        stackInfo['keyboard'] = true;
      } else if (line === 'processReceivedMessage') {
        stackInfo['popup'] = true;
      } else if (line === 'handleMouseMove') {
        stackInfo['mousemove'] = true;
      }
    }

    // exitLog overrides any other exclusions, so we look for it separately.
    // we also remove some of the unnecessary messages to reduce log file size
    for(let i = 0; i < stackInfo.stack.trace.length; i++) {
      if (stackInfo.stack.trace[i] === 'finish') {
        stackInfo['exitLogs'] = true;
        break;
      }

      // if we hit one of these, we remove the rest of the array and call it a
      // day. Chances are there's nothing of value past this point.
      if (stackInfo.stack.trace[i].indexOf('promise callback') !== -1
          || stackInfo.stack.trace[i].indexOf('asyncGeneratorStep') !== -1
          || stackInfo.stack.trace[i].indexOf('_asyncToGenerator') !== -1
          || stackInfo.stack.trace[i].startsWith('_next')) {
        stackInfo.stack.trace.splice(i);
        break;
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
    // we don't do timeouts on background script
    if (this.isBackgroundScript) {
      return false;
    }
    if (this.stopTime && performance.now() > this.stopTime) {
      if (this.conf.allowLogging) {
        this.log('force', 'debug', '-----[ alloted time has run out. logging will stop ]-----');
        this.finish();
      }
      return true;
    }
    return false;
  }

  isLoggingAllowed() {
    return this.conf.allowLogging;
  }

  isLoggingToFile() {
    return this.conf.allowLogging && this.conf.fileOptions?.enabled;
  }

  // NOTE: THIS FUNCTION IS NEVER USED INTERNALLY!
  canLog(component) {
    const stackInfo = this.parseStack();

    if (!this.conf.allowLogging && !stackInfo.exitLogs) {
      return false;
    }

    if (this.isBlacklistedOrigin(stackInfo)) {
      return false;
    }

    // if either of these two is true, we allow logging to happen (forbidden origins were checked above)
    return (this.canLogFile(component) || this.canLogConsole(component) || stackInfo.exitLogs);
  }

  canLogFile(component) {
    if (!this.conf?.fileOptions?.enabled || this.temp_disable) {
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

  canLogConsole(component, stackInfo?) {
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
      message: message,
      stack: stackInfo,
    });
  }

  logToConsole(level, message, stackInfo) {
    try {
      switch (level) {
        case 'error':
          console.error(...message, {stack: stackInfo});
          break;
        case 'warn':
          console.warn(...message, {stack: stackInfo});
          break;
        case 'info':
          console.info(...message, {stack: stackInfo});
          break;
        default:
          console.log(...message, {stack: stackInfo});
      }
    } catch (e) {
      console.error("Message too big to log. Error:", e, "stackinfo:", stackInfo);
    }
  }

  // level is unused as of now, but this may change in the future
  // levels: 'info', 'warn', 'error'.
  // if level is `true` (bool), logging happens regardless of any other
  // settings
  log(level, component, ...message) {
    const stackInfo = this.parseStack();

    if (!this.conf || (!this.conf.allowLogging && !stackInfo.exitLogs)) {
      return;
    }

    // skip all checks if we force log
    if (level === 'force') {
      if (this.conf.fileOptions?.enabled) {
        this.logToFile(message, stackInfo);
      }
      if (this.conf.consoleOptions?.enabled) {
        this.logToConsole(level, message, stackInfo);
      }
      return; // don't check further — recursion-land ahead!
    }

    if (this.isTimeUp() && !stackInfo.exitLogs) {
      return;
    }

    // don't log stuff from blacklisted origin (unless logger conf says otherwise)
    if (this.isBlacklistedOrigin(stackInfo)) {
      return;
    }

    if (this.conf.fileOptions?.enabled) {
      if (this.canLogFile(component) || stackInfo.exitLogs) {
        this.logToFile(message, stackInfo);
      }
    }
    if (this.conf.consoleOptions?.enabled) {
      if (this.canLogConsole(component) || stackInfo.exitLogs) {
        this.logToConsole(level, message, stackInfo);
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
      let i = this.history.length;

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

  appendLog(logs) {
    this.history = this.history.concat(logs);
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

  saveViaBgScript() {
    console.info('[info] will attempt to save. Issuing "show-logger"');
    if (this.isBackgroundScript) {
      console.info('[info] Background script cannot display logger UI.');
      return;
    }
    // if (!this.conf?.fileOptions?.enabled) {
    //   console.info('[info] Logging to file is disabled. Logger won\'t get shown.');
    //   return;
    // }

    Comms.sendMessage({cmd: 'show-logger', forwardToSameFramePort: true, port: 'content-ui-port'});

    let exportObject;
    try {
      exportObject = {
        pageLogs: decycle(this.history),
        backgroundLogs: decycle(this.globalHistory),
        loggerFileOptions: this.conf.fileOptions,
      }
    } catch (e) {
      console.error("[fail] error parsing logs!", e)
      return;
    }

    try {
    Comms.sendMessage({cmd: 'emit-logs', payload: JSON.stringify(exportObject), forwardToSameFramePort: true, port: 'content-ui-port'})
    } catch (e) {
      console.log("failed to send message")
    }
  }

  saveToVuex() {
    console.info('[info] will attempt to save to vuex store.');
    if (!this.conf?.fileOptions?.enabled || this.isBackgroundScript) {
      console.info('[info] Logging to file is either disabled or we\'re not on the content script. Not saving.');
      return;
    }

    if (!this.vuexStore) {
      console.error("[info] No vue store.");
      if (!this.uwInstance) {
        console.error('[info] no vue instance either. Not logging.');
        return;
      }
      console.info("[info] Initializing vue and vuex instance ...");
      this.uwInstance.initVue();
    }

    console.info('[info] vuex store present. Parsing logs.');

    let exportObject;
    try {
      exportObject = {
        pageLogs: decycle(this.history),
        backgroundLogs: decycle(this.globalHistory),
        loggerFileOptions: this.conf.fileOptions,
      }
    } catch (e) {
      console.error("[fail] error parsing logs!", e)
      return;
    }

    console.info('[info] Logs were parsed successfuly. Putting stuff to vuex ...');
    try {
      this.vuexStore.dispatch('uw-set-log', exportObject);
    } catch (e) {
      console.log("[fail] error saving to vuex", e);
      return;
    }

    console.info('[info] Export object saved to vuex store.')
  }
}

if (process.env.CHANNEL !== 'stable'){
  console.info('Logger loaded');
}

export default Logger;
