import { describe, it, expect, vi } from 'vitest';
import logger from './logger';

describe('Logger class', () => {
  it('should set and get log level', () => {
    logger.setLogLevel('warn');
    expect(logger.logLevel).toBe('warn');
  });

  it('should throw an error for invalid log level', () => {
    expect(() => logger.setLogLevel('invalid')).toThrow('setLogLevel: Invalid log level: invalid');
  });

  it('should log messages based on log level', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.setLogLevel('info');
    logger.info('This is an info message');
    expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'This is an info message');
    consoleSpy.mockRestore();
  });

  it('should not log messages below the current log level', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.setLogLevel('warn');
    logger.debug('This debug message should not appear');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should enable debug mode', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.setDebug(true);
    logger.debug('Debug mode is enabled');
    expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'Debug mode is enabled');
    consoleSpy.mockRestore();
  });

  it('should disable debug mode', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.setDebug(false);
    logger.info('Debug mode is disabled');
    expect(consoleSpy).toHaveBeenCalledWith('[INFO]', 'Debug mode is disabled');
    consoleSpy.mockRestore();
  });

  it('should translate "verbose" to "debug" using altLevelsNames', () => {
    logger.setLogLevel('verbose');
    expect(logger.logLevel).toBe('debug');
  });

  it('should translate "quiet" to "log" using altLevelsNames', () => {
    logger.setLogLevel('quiet');
    expect(logger.logLevel).toBe('log');
  });

  it('should throw an error for invalid alt level names', () => {
    expect(() => logger.setLogLevel('invalidAlt')).toThrow('setLogLevel: Invalid log level: invalidAlt');
  });

  it('should log messages correctly when using alt level names', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.setLogLevel('verbose');
    logger.debug('This is a verbose message');
    expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'This is a verbose message');
    consoleSpy.mockRestore();
  });

  it('should not log messages below the translated alt level', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.setLogLevel('quiet');
    logger.info('This info message should not appear');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should set and get the "log" log level', () => {
    logger.setLogLevel('log');
    expect(logger.logLevel).toBe('log');
  });

  it('should log messages at the "log" level', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.setLogLevel('log');
    logger.log('This is a log-level message');
    expect(consoleSpy).toHaveBeenCalledWith('This is a log-level message');
    consoleSpy.mockRestore();
  });

  it('should not log messages below the "log" level', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.setLogLevel('log');
    logger.debug('This debug message should not appear');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log messages correctly when using the "quiet" alias for "log"', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.setLogLevel('quiet');
    logger.log('This is a quiet-level message');
    expect(consoleSpy).toHaveBeenCalledWith('This is a quiet-level message');
    consoleSpy.mockRestore();
  });

  it('should temporarily change the log level with setTempLogLevel', () => {
    logger.setLogLevel('info');
    const isTempLevel = logger.setTempLogLevel('debug');
    expect(isTempLevel).toBe(true);
    expect(logger.logLevel).toBe('debug');
  });

  it('should not change the log level if the same level is provided to setTempLogLevel', () => {
    logger.setLogLevel('info');
    const isTempLevel = logger.setTempLogLevel('info');
    expect(isTempLevel).toBe(false);
    expect(logger.logLevel).toBe('info');
  });

  it('should revert to the original log level with resetLogLevel', () => {
    logger.setLogLevel('info');
    logger.setTempLogLevel('debug');
    expect(logger.logLevel).toBe('debug');
    logger.resetLogLevel();
    expect(logger.logLevel).toBe('info');
  });

  it('should do nothing with resetLogLevel if no temporary log level was set', () => {
    logger.setLogLevel('info');
    logger.resetLogLevel();
    expect(logger.logLevel).toBe('info');
  });
});
