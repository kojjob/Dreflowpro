/**
 * Development-only logger utility
 * Prevents console statements from appearing in production builds
 */

class Logger {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  static log(...args: any[]): void {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  static error(...args: any[]): void {
    if (this.isDevelopment) {
      console.error(...args);
    }
  }

  static warn(...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(...args);
    }
  }

  static debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(...args);
    }
  }

  static info(...args: any[]): void {
    if (this.isDevelopment) {
      console.info(...args);
    }
  }

  // For production error logging (always enabled)
  static errorProduction(message: string, error?: any): void {
    // In production, you might want to send this to a service like Sentry
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service
      console.error(`[PRODUCTION ERROR] ${message}`, error);
    } else {
      console.error(message, error);
    }
  }
}

export default Logger;