class Logger {
  constructor(conf) {
    this.conf = conf;
    this.history = [];
    this.startTime = performance.now();
    this.temp_disable = false;
  }

  clear() {
    this.log = [];
    this.startTime = performance.now();
  }

  setConf(conf) {
    this.conf = conf;
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

  getLogFileString() {
    let logfileStr = '';
    let logTs = '';       // number of seconds since extension started on a given page¸
    for (let i = 0; i < this.history.length; i++) {
      logTs = ((this.history[i].ts - Math.floor(this.performance.now)) / 3).toFixed(3);
      logfileStr = `${logfileStr}[@${logTs}] -- ${this.history[i].message}\n`
    }

    return logfileStr;
  }

  pause() {
    this.temp_disable = true;
  }
  resume() {
    this.temp_disable = false;
  }

  canLog(component) {
    return this.canLogFile(component) || this.canLogConsole(component);
  }

  canLogFile(component) {
    if (!this.conf.fileOptions.enabled || this.temp_disable) {
      return false;
    }
    if (component.length ) {
      for (const c in component) {
        if (this.conf.fileOptions[component]) {
          return this.conf.fileOptions[component];
        }
      }
    } 
    return this.conf.fileOptions[component];
  }
  canLogConsole(component) {
    if (!this.conf.consoleOptions.enabled || this.temp_disable) {
      return false;
    }
    if (Array.isArray(component) && component.length) {
      for (const c in component) {
        if (this.conf.consoleOptions[component]) {
          return this.conf.consoleOptions[component];
        }
      }
    } 
    return this.conf.consoleOptions[component];
  }

  // level is unused as of now, but this may change in the future
  // levels: 'info', 'warn', 'error'
  log(level, component, ...message) {
    if (!this.conf) {
      return;
    }
    if (this.conf.logToFile) {
      if (this.canLogFile(component)) {
        let ts = performance.now();
        if (ts <= this.history[this.history.length - 1]) {
          ts = this.history[this.history.length - 1] + 0.00001;
        }

        this.history.push({
          ts: ts,
          message: JSON.stringify(message),
        })
      }
    }
    if (this.conf.logToConsole) {
      if (this.canLogConsole(component)) {
        console.log(...message);
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


}

export default Logger;
