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
        
        // Handle Error objects specially
        if (arg instanceof Error) {
          return {
            name: arg.name,
            message: arg.message,
            stack: arg.stack
          };
        }
        
        // Handle objects (including arrays)
        if (typeof arg === 'object') {
          // Handle true empty objects
          if (Object.keys(arg).length === 0 && arg.constructor === Object) {
            return '[truly empty object]';
          }
          
          try {
            // Try to stringify to check if it's serializable
            const stringified = JSON.stringify(arg);
            // If stringification results in '{}' but object has keys, it means non-enumerable properties
            if (stringified === '{}' && Object.keys(arg).length === 0) {
              return {
                toString: arg.toString(),
                constructor: arg.constructor?.name || 'Unknown',
                prototype: Object.getPrototypeOf(arg)?.constructor?.name || 'Unknown',
                hasOwnProperties: Object.getOwnPropertyNames(arg).length > 0,
                ownPropertyNames: Object.getOwnPropertyNames(arg).slice(0, 5), // Limit to first 5
                ...(arg.message && { message: arg.message }),
                ...(arg.status && { status: arg.status }),
                ...(arg.response && { response: 'Response object present' })
              };
            }
            return arg;
          } catch (e) {
            // If it fails due to circular references, extract key properties safely
            return {
              toString: arg.toString(),
              constructor: arg.constructor?.name || 'Unknown',
              keys: Object.keys(arg),
              serializationError: e.message,
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