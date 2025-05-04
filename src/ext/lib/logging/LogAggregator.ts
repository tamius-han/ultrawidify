import { log } from 'console';

export const BLANK_LOGGER_CONFIG: LogConfig = {
  logToConsole: false,
  logToFile: false,
  component: {
  },
  origins: {
    videoRescan: { disabled: true},
  }
}

export interface LogSourceOptions {
  src?: string;
  origin?: string;
}

export interface LogComponentConfig {
  enabled: boolean;
}

export interface LogConfig {
  logToConsole?: boolean;
  logToFile?: boolean;
  stopAfter?: number;
  component?: {[x: string]: LogComponentConfig};
  origins?: {
    videoRescan?: {
      disabled: boolean;
    }
  }
}

const STORAGE_LOG_SETTINGS_KEY = 'uw-log-config';

export class LogAggregator {
  private segment: string;
  private config: LogConfig;

  private startTime: number;

  history: any[];

  static async getConfig() {
    let ret = await chrome.storage.local.get(STORAGE_LOG_SETTINGS_KEY);

    if (process.env.CHANNEL === 'dev') {
      try {
        console.info("[LogAggregator::getSaved] Got settings:", JSON.parse(ret[STORAGE_LOG_SETTINGS_KEY]));
      } catch (e) {
        console.info("[LogAggregator::getSaved] No settings.", ret)
      }
    }

    try {
      return JSON.parse(ret[STORAGE_LOG_SETTINGS_KEY]);
    } catch (e) {
      return JSON.parse(JSON.stringify(BLANK_LOGGER_CONFIG));
    }
  }

  static async saveConfig(conf: LogConfig) {
    try {
      const confCp = JSON.parse(JSON.stringify(conf));
      if (process.env.CHANNEL === 'dev') {
        console.info('Saving logger conf:', confCp)
      }

      await chrome.storage.local.set({[STORAGE_LOG_SETTINGS_KEY]: JSON.stringify(confCp)} );
    } catch (e) {
      console.warn('[LogAggregator::saveConfig] Error while trying to save logger config:', e);
    }
  }

  static syncConfig(callback: (x) => void) {
    chrome.storage.onChanged.addListener( (changes, area) => {
      if (changes.uwLogger) {
        const newLoggerConf = JSON.parse(changes.uwLogger.newValue)
        if (process.env.CHANNEL === 'dev') {
          console.info('Logger settings reloaded. New conf:', newLoggerConf);
        }
        callback(newLoggerConf);
      }
    });
  }

  constructor(segment: string) {
    this.segment = segment;

    chrome.storage.onChanged.addListener((changes, area) => {
      this.storageChangeListener(changes, area)
    });

    this.init();
  }

  private canLog(component: string, sourceOptions?: LogSourceOptions): boolean {
    // component is not in config, so we add a blank entry
    if (this.config && !this.config.component[component]) {
      this.config.component[component] = {enabled: false};
      LogAggregator.saveConfig(this.config);
      return false;
    }
    if (this.config?.component?.[component]?.enabled) {
      if (sourceOptions?.origin && this.config?.origins?.[sourceOptions.origin]?.disabled) {
        return false;
      }
      return true;
    }

    return false;
  }

  private storageChangeListener(changes, area) {
    if (!changes[STORAGE_LOG_SETTINGS_KEY]) {
      console.info('We dont have any logging settings, not processing frther', changes);
      return;
    }

    try {
      this.config = JSON.parse(changes[STORAGE_LOG_SETTINGS_KEY].newValue);
    } catch (e) {
      console.warn('[uwLogger] Error while trying to parse new conf for logger:', e, '\nWe received the following changes:', changes, 'for area:', area);
    }

    // This code can only execute if user tried to enable or disable logging
    // through the popup. In cases like this, we do not gate the console.log
    // behind a check, since we _always_ want to have this feedback in response
    // to an action.
    console.info(
      '[uwLogger] logger config changed! New configuration:',
      this.config, '\nraw changes:', changes, 'area?', area,
      '\n————————————————————————————————————————————————————————————————————————\n\n\n\n\n\n\n\n\n\n\n\n-----\nLogging with new settings starts now.'
    );

    this.init(this.config);
  }

  private parseStack() {
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

  // TODO: implement this
  private stopLogging() {

  }

  async init(config?: LogConfig) {
    if (!config) {
      config = await LogAggregator.getConfig();
    }

    this.config = config;
    this.startTime = performance.now();

    if (this.config?.stopAfter) {
      setTimeout(
        () => {
          this.stopLogging();
        },
        this.config.stopAfter * 1000
      );
    }
  }

  log(component: string, logLevel: string, sourceOptions: LogSourceOptions, message: string, ...data: any[]) {
    if (! this.canLog(component, sourceOptions)) {
      return;
    }

    if (this.config.logToFile) {

    }

    if (this.config.logToConsole){
      console[logLevel](`[${this.segment}]>>${message}`, ...data, {stack: this.parseStack()});
    }
  }
}
