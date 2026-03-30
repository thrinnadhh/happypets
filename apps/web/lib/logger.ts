/**
 * Centralized Logger
 * Used throughout the app for structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  error?: unknown;
}

class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private log(level: LogLevel, message: string, error?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      error,
    };

    const isDevelopment = process.env.NODE_ENV === 'development';
    const logLevel = (process.env.LOG_LEVEL || 'info') as LogLevel;

    // Only log if level is important enough
    const levels = ['debug', 'info', 'warn', 'error'];
    if (levels.indexOf(level) < levels.indexOf(logLevel)) {
      return;
    }

    if (isDevelopment) {
      // Console output in development
      const prefix = `[${entry.module}] ${entry.level.toUpperCase()}`;
      if (error) {
        console.log(prefix, entry.message, error);
      } else {
        console.log(prefix, entry.message);
      }
    } else {
      // Structured JSON in production
      console.log(JSON.stringify(entry));
    }
  }

  debug(message: string, error?: unknown) {
    this.log('debug', message, error);
  }

  info(message: string, error?: unknown) {
    this.log('info', message, error);
  }

  warn(message: string, error?: unknown) {
    this.log('warn', message, error);
  }

  error(message: string, error?: unknown) {
    this.log('error', message, error);
  }
}

/**
 * Get logger instance for module
 */
export const getLogger = (module: string) => {
  return new Logger(module);
};

export default getLogger;
