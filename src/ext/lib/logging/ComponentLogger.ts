import { LogAggregator, LogSourceOptions } from './LogAggregator';

export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Log = 'log',
  Warn = 'warn',
  Error = 'error',
}

export type ComponentLoggerOptions = {
  styles?: {
    [x in LogLevel]?: string;
  }
}

export class ComponentLogger {
  private logAggregator: LogAggregator;
  private component: string;
  private componentOptions?: ComponentLoggerOptions;

  constructor(logAggregator: LogAggregator, component: string, componentOptions?: ComponentLoggerOptions) {
    this.logAggregator = logAggregator;
    this.component = component;
    this.componentOptions = componentOptions;
  }

  private handleLog(logLevel: LogLevel, sourceFunction: string | LogSourceOptions, ...message: any) {
    let functionSource = typeof sourceFunction === 'string' ? sourceFunction : sourceFunction?.src;

    let consoleMessageString = `[${this.component}${functionSource ? `::${functionSource}` : ''}]`;
    const consoleMessageData = []

    for (const m of message) {
      if (typeof m === 'string') {
        consoleMessageString = `${consoleMessageString} ${m}`;
      } else if (typeof m === 'number') {
        consoleMessageString = `${consoleMessageString} %f`;
        consoleMessageData.push(m);
      } else if (typeof HTMLElement !== 'undefined' && m instanceof HTMLElement) { // HTMLElement does not exist in background script, but this class may
        consoleMessageString = `${consoleMessageString} %o`;
        consoleMessageData.push(m);
      } else {
        consoleMessageString = `${consoleMessageString} %O`;
        consoleMessageData.push(m);
      }
    }

    const style = this.componentOptions?.styles?.[logLevel] ?? this.componentOptions?.styles?.[LogLevel.Log];
    if (style) {
      consoleMessageString = `%c${consoleMessageString}`;
      consoleMessageData.unshift(style);
    }

    this.logAggregator.log(this.component, logLevel, typeof sourceFunction === 'object' ? sourceFunction : undefined, consoleMessageString, ...consoleMessageData);
  }

  debug(sourceFunction: string | LogSourceOptions, ...message: any[]) {
    this.handleLog(LogLevel.Debug, sourceFunction, ...message);
  }
  info(sourceFunction: string | LogSourceOptions, ...message: any[]) {
    this.handleLog(LogLevel.Info, sourceFunction, ...message);
  }
  log(sourceFunction: string | LogSourceOptions, ...message: any[]) {
    this.handleLog(LogLevel.Log, sourceFunction, ...message);
  }
  warn(sourceFunction: string | LogSourceOptions, ...message: any[]) {
    this.handleLog(LogLevel.Warn, sourceFunction, ...message);
  }
  error(sourceFunction: string | LogSourceOptions, ...message: any[]) {
    this.handleLog(LogLevel.Error, sourceFunction, ...message);
  }

}
