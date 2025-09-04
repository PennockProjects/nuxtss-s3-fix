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

  it('should translate "log" to "debug" using altLevelsNames', () => {
    logger.setLogLevel('log');
    expect(logger.logLevel).toBe('debug');
  });

  it('should translate "quiet" to "result" using altLevelsNames', () => {
    logger.setLogLevel('quiet');
    expect(logger.logLevel).toBe('result');
  });

  it('should throw an error for invalid alt level names', () => {
    expect(() => logger.setLogLevel('invalidAlt')).toThrow('setLogLevel: Invalid log level: invalidAlt');
  });

  it('should log messages correctly when using alt level names', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.setLogLevel('log');
    logger.debug('This is a debug message');
    expect(consoleSpy).toHaveBeenCalledWith('[DEBUG]', 'This is a debug message');
    consoleSpy.mockRestore();
  });

  it('should not log messages below the translated alt level', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    logger.setLogLevel('quiet');
    logger.info('This info message should not appear');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should set and get the "result" log level', () => {
    logger.setLogLevel('result');
    expect(logger.logLevel).toBe('result');
  });

  it('should log messages at the "result" level', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.setLogLevel('result');
    logger.result('This is a result-level message');
    expect(consoleSpy).toHaveBeenCalledWith('This is a result-level message');
    consoleSpy.mockRestore();
  });

  it('should not log messages below the "result" level', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logger.setLogLevel('result');
    logger.debug('This debug message should not appear');
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log messages correctly when using the "quiet" alias for "result"', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.setLogLevel('quiet');
    logger.result('This is a quiet-level message');
    expect(consoleSpy).toHaveBeenCalledWith('This is a quiet-level message');
    consoleSpy.mockRestore();
  });
});
