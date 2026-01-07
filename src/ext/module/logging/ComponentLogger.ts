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

const OBJECT_SEPARATOR_STYLE = {color: '#fff'};
const OBJECT_KEY_STYLE = {color: '#ebe4ff69'};
const OBJECT_STRING_STYLE = {color: '#80b6e5ff'};
const OBJECT_NUMBER_STYLE = {color: 'rgba(127, 104, 204, 1)'};
const OBJECT_BOOL_TRUE = {color: 'rgba(148, 206, 187, 1)'};
const OBJECT_BOOL_FALSE = {color: 'rgba(214, 82, 49, 1)'};
const OBJECT_UNDEFINED_STYLE = {color: '#ffffff3a'};

export class ComponentLogger {
  private logAggregator: LogAggregator;
  private component: string;
  private componentOptions?: ComponentLoggerOptions;

  constructor(logAggregator: LogAggregator, component: string, componentOptions?: ComponentLoggerOptions) {
    this.logAggregator = logAggregator;
    this.component = component;
    this.componentOptions = componentOptions;
  }

  private parseStyle(s?: string) {
    if (!s) {
      return;
    }

    const segments = s.split(';').map(x =>x.trim());
    const out = {};
    for (const sg of segments) {
      const [key, value] = sg.split(':', 1);
      out[key] = value;
    }

    return out;
  }

  private mix(base?: any, style?: any) {
    if (!base && !style) {
      return undefined;
    }

    const combined = {...base, ...style};
    let out = [];
    for (const key in combined) {
      out.push(`${key}: ${combined[key]}`);
    }

    return out.join('; ');
  }

  private generateObjectPreview(obj: any, baseStyle?: any) {
    const maxKeys = 5;

    const colorArgs = [this.mix(baseStyle, OBJECT_SEPARATOR_STYLE)];
    const objKeys = [];

    let keyCount = 0;
    for (const key of Object.keys(obj)) {
      if (keyCount >= maxKeys) {
        objKeys.push('...');
        break;
      }

      if (typeof obj[key] === 'object') {
        if (obj[key] === null) {
          objKeys.push(` %c${key}%c: %c${obj[key]}%c`);
          colorArgs.push(
            this.mix(baseStyle, OBJECT_KEY_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE),
            this.mix(baseStyle, OBJECT_NUMBER_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE)
          );
        } else {
          if (Array.isArray(obj[key])) {
            objKeys.push(`%c${key}%c: [...]`);
          } else {
            objKeys.push(`%c${key}%c: {...}`);
          }
          colorArgs.push(
            this.mix(baseStyle, OBJECT_KEY_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE)
          );
        }
      } else {
        if (typeof obj[key] === 'number' ) {
          objKeys.push(`%c${key}%c: %c${obj[key]}%c`);
          colorArgs.push(
            this.mix(baseStyle, OBJECT_KEY_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE),
            this.mix(baseStyle, OBJECT_NUMBER_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE)
          );
        } else if (typeof obj[key] === 'boolean') {
          objKeys.push(`%c${key}%c: %c${obj[key]}%c`);
          colorArgs.push(
            this.mix(baseStyle, OBJECT_KEY_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE),
            this.mix(baseStyle, obj[key] ? OBJECT_BOOL_TRUE : OBJECT_BOOL_FALSE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE)
          );
        } else if (typeof obj[key] === 'undefined') {
          objKeys.push(`%c${key}%c: %o`);
          colorArgs.push(
            this.mix(baseStyle, OBJECT_KEY_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE),
            obj[key]
          );
        } else {
          objKeys.push(`%c${key}%c: %c${obj[key]}%c`);
          colorArgs.push(
            this.mix(baseStyle, OBJECT_KEY_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE),
            this.mix(baseStyle, OBJECT_STRING_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE)
          );
        }
      }
      keyCount++;
    }

    // unset colors
    colorArgs.push(baseStyle ? this.mix(baseStyle, undefined) : '');
    return {
      str: `%c{ ${objKeys.join(', ')} }%c`,
      colors: colorArgs
    }
  }

  private generateArrayPreview(obj: any[], baseStyle?: any) {
    const maxKeys = 5;

    const limit = Math.min(obj.length, maxKeys);
    const arrValues = [];
    const colorArgs = [this.mix(baseStyle, OBJECT_SEPARATOR_STYLE)];

    for (let i = 0; i < limit; i++) {

      if (typeof obj[i] === 'object') {
        if (obj[i] === null) {
          arrValues.push(`%c${obj[i]}%c`);
          colorArgs.push(
            this.mix(baseStyle, OBJECT_NUMBER_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE)
          );
        } if (Array.isArray(obj[i])) {
          arrValues.push(` [...]`);
        } else {
          arrValues.push(` {...}`);
        }
      } else {
        if (typeof obj[i] === 'number' ) {
          arrValues.push(`%c${obj[i]}%c`);
          colorArgs.push(
            this.mix(baseStyle, OBJECT_NUMBER_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE)
          );
        } else if (typeof obj[i] === 'boolean') {
          arrValues.push(`%c${obj[i]}%c`);
          colorArgs.push(
            this.mix(baseStyle, obj[i] ? OBJECT_BOOL_TRUE : OBJECT_BOOL_FALSE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE)
          );
        } else if (typeof obj[i] === 'undefined') {
          arrValues.push(`%o`);
          colorArgs.push(
            obj[i],
          );
        } else {
          arrValues.push(`%c${obj[i]}%c`);
          colorArgs.push(
            this.mix(baseStyle, OBJECT_STRING_STYLE),
            this.mix(baseStyle, OBJECT_SEPARATOR_STYLE)
          );
        }
      }
    }

    if (obj.length > limit) {
      arrValues.push('...');
    }

    // unset colors
    colorArgs.push(baseStyle ? this.mix(baseStyle, undefined) : '');
    return  {
      str: `%c[ ${arrValues.join(', ')} ]%c`,
      colors: colorArgs
    }
  }

  private handleLog(logLevel: LogLevel, sourceFunction: string | LogSourceOptions, ...message: any) {

    if (!this.logAggregator.canLog(this.component)) {
      return;
    }

    let functionSource = typeof sourceFunction === 'string' ? sourceFunction : sourceFunction?.src;

    let consoleMessageString = `[${this.component}${functionSource ? `::${functionSource}` : ''}]`;
    const consoleMessageData = []

    const styleObj = this.parseStyle(this.componentOptions?.styles?.[logLevel] ?? this.componentOptions?.styles?.[LogLevel.Log]);

    let styleArgsCount = 0;

    for (const m of message) {
      if (styleArgsCount --> 0) {
        consoleMessageData.push(m);
        continue;
      }

      if (typeof m === 'string') {
        consoleMessageString = `${consoleMessageString} ${m}`;

        styleArgsCount = m.split('%c').length - 1;
      } else if (typeof m === 'number') {
        consoleMessageString = `${consoleMessageString} %c${m}%c`;
        consoleMessageData.push(
          this.mix(styleObj, OBJECT_NUMBER_STYLE),
          ''
        );
      } else if (typeof m === 'undefined') {
        consoleMessageString = `${consoleMessageString} %c%o%c`;
        consoleMessageData.push(
          this.mix(styleObj, OBJECT_UNDEFINED_STYLE),
          m,
          ''
        );
      } else if (typeof HTMLElement !== 'undefined' && m instanceof HTMLElement) { // HTMLElement does not exist in background script, but this class may
        consoleMessageString = `${consoleMessageString} %o`;
        consoleMessageData.push(m);
      } else {
        if (m === null) {
          consoleMessageString = `${consoleMessageString} %c${m}%c`;
          consoleMessageData.push(
            this.mix(styleObj, OBJECT_NUMBER_STYLE),
            m,
            ''
          );
        } else if (Array.isArray(m)) {
          const {str, colors} = this.generateArrayPreview(m, styleObj);
          consoleMessageString = `${consoleMessageString} ${str}%O`;
          consoleMessageData.push(...colors, m);
        } else {
          const {str, colors} = this.generateObjectPreview(m, styleObj);
          consoleMessageString = `${consoleMessageString} ${str}%O`;
          consoleMessageData.push(...colors, m);
        }
      }
    }

    const style = this.componentOptions?.styles?.[logLevel] ?? this.componentOptions?.styles?.[LogLevel.Log];
    if (style) {
      consoleMessageString = `%c${consoleMessageString}`;
      consoleMessageData.unshift(style);
    }

    this.logAggregator.log(logLevel, consoleMessageString, ...consoleMessageData);
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
