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
      // Handle empty objects and undefined values gracefully
      const safeArgs = args.map(arg => {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        
        // Handle empty objects
        if (typeof arg === 'object' && Object.keys(arg).length === 0) {
          return '[empty object]';
        }
        
        // Handle Error objects specially
        if (arg instanceof Error) {
          return {
            name: arg.name,
            message: arg.message,
            stack: arg.stack
          };
        }
        
        // Handle objects with circular references or non-enumerable properties
        if (typeof arg === 'object') {
          try {
            // Try to stringify to check if it's serializable
            JSON.stringify(arg);
            return arg;
          } catch (e) {
            // If it fails, extract key properties safely
            return {
              toString: arg.toString(),
              constructor: arg.constructor?.name || 'Unknown',
              keys: Object.keys(arg),
              ...(arg.message && { message: arg.message }),
              ...(arg.status && { status: arg.status }),
              ...(arg.response && { response: 'Response object present' })
            };
          }
        }
        
        return arg;
      });
      console.error(...safeArgs);
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