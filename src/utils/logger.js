class Logger {
  constructor(logLevel = 'info') {
    if (Logger.instance) {
      return Logger.instance; // Return existing instance if already created
    }
      this.logLevel = logLevel;
      this.levels = {
          debug: 0,
          info: 1,
          result: 2,
          warn: 3,
          error: 4
      };
      this.altLevelsNames = {
        log: 'debug',
        quiet: 'result'
      }
      Logger.instance = this; // Store the new instance
  }

  setLogLevel(level) {
    if (typeof level !== 'string') {
      throw new Error('Log level must be a string');
    }
    const normalLevel = this.translateAltLevel(level)
    if(!this.isValidLevel(normalLevel)) {
      throw new Error(`setLogLevel: Invalid log level: ${level}`);
    }
    this.logLevel = normalLevel;
  }

  setDebug(isDebug) {
    if (isDebug) {
      this.setLogLevel('debug');
      this.debug('Debug mode is enabled');
    } else {
      this.debug('Debug mode is disabled');
      this.setLogLevel('info'); // Default to info if not debug
    }
  }

  isValidLevel(level) {
    return this.levels[level] !== undefined;
  }

  translateAltLevel(level) {
    return this.altLevelsNames[level] || level;
  }

  shouldLog(level) {
    return level = (level == this.levels.error) || (this.levels[level] >= this.levels[this.logLevel]);
  }

  _log(level, ...args) {
      if (this.shouldLog(level)) {
          if(level === 'result') {
            console.log(...args);
          } else {
            const prefix = `[${level.toUpperCase()}]`;
            console[level](prefix, ...args);
          }
      }
  }

  debug(...args) {
      this._log('debug', ...args);
  }

  log(...args) {
      this._log('info', ...args);
  }

  info(...args) {
      this._log('info', ...args);
  }

  result(...args) {
      this._log('result', ...args);
  }

  warn(...args) {
      this._log('warn', ...args);
  }

  error(...args) {
      this._log('error', ...args);
  }
}

// Usage:
const globalLogger = new Logger();

export default globalLogger;