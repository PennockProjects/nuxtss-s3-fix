class Logger {
  constructor(logLevel = 'info') {
    if (Logger.instance) {
      return Logger.instance; // Return existing instance if already created
    }
    this.levels = {
        debug: 0,
        info: 1,
        log: 2,
        warn: 3,
        error: 4
    };
    this.logLevels = [
      "debug",
      "info",
      "log",
      "warn",
      "error"
    ];
    this.altLevelNames = {
      verbose: 'debug',
      quiet: 'log'
    }
    if (!this.isValidLevel(logLevel)) {
      throw new Error(`Invalid log level: ${logLevel}`);
    }
    this.logLevel = logLevel;
    this.originalLogLevel = null;
    Logger.instance = this; // Store the new instance
  }

  getLogLevel() {
    return this.logLevel;
  }

  setLogLevel(logLevel) {
    if (typeof logLevel !== 'string') {
      throw new Error('Log level must be a string');
    }
    const normalLevel = this.translateAltLevel(logLevel)
    if(!this.isValidLevel(normalLevel)) {
      throw new Error(`setLogLevel: Invalid log level: ${logLevel}`);
    }
    this.logLevel = normalLevel;
  }

  setTempLogLevel(tempLogLevel) {
    let isTempLevel = false;
    if (tempLogLevel && tempLogLevel !== this.logLevel) {
      this.originalLogLevel = this.logLevel;
      this.setLogLevel(tempLogLevel)
      if(this.logLevel === this.originalLogLevel) {
        this.originalLogLevel = null;
      } else {
        isTempLevel = true;
      }
    }
    return isTempLevel;
  }

  resetLogLevel() {
    if (this.originalLogLevel) {
      this.setLogLevel(this.originalLogLevel);
      this.originalLogLevel = null;
    }
  }

  setDebug(isDebug) {
    if (isDebug) {
      this.setLogLevel(this.logLevels[this.levels.debug]);
      this.debug('Debug mode is enabled');
    } else {
      this.debug('Debug mode is disabled');
      this.setLogLevel(this.logLevels[this.levels.info]); // Default to info if not debug
    }
  }

  isValidLevel(logLevel) {
    return this.levels[logLevel] !== undefined;
  }

  translateAltLevel(logLevel) {
    return this.altLevelNames[logLevel] || logLevel;
  }

  shouldLog(logLevel) {
    return logLevel = (this.levels[logLevel] == this.levels.error) || (this.levels[logLevel] >= this.levels[this.logLevel]);
  }

  _log(logLevel, ...args) {
      if (this.shouldLog(logLevel)) {
          if(logLevel === this.logLevels[this.levels.log]) {
            console.log(...args);
          } else {
            const prefix = `[${logLevel.toUpperCase()}]`;
            console[logLevel](prefix, ...args);
          }
      }
  }

  debug(...args) {
      this._log(this.logLevels[this.levels.debug], ...args);
  }

  info(...args) {
      this._log(this.logLevels[this.levels.info], ...args);
  }

  log(...args) {
      this._log(this.logLevels[this.levels.log], ...args);
  }

  warn(...args) {
      this._log(this.logLevels[this.levels.warn], ...args);
  }

  error(...args) {
      this._log(this.logLevels[this.levels.error], ...args);
  }
}

// Usage:
const globalLogger = new Logger();

export default globalLogger;