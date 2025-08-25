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
            stack: arg.stack,
            cause: arg.cause,
            toString: arg.toString()
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
            if (stringified === '{}') {
              const keys = Object.keys(arg);
              const ownProps = Object.getOwnPropertyNames(arg);
              
              return {
                type: 'non_serializable_object',
                toString: arg.toString(),
                constructor: arg.constructor?.name || 'Unknown',
                prototype: Object.getPrototypeOf(arg)?.constructor?.name || 'Unknown',
                hasKeys: keys.length > 0,
                keys: keys.slice(0, 10), // Show first 10 keys
                hasOwnProperties: ownProps.length > 0,
                ownPropertyNames: ownProps.slice(0, 10), // Show first 10 properties
                // Common error/object properties
                ...(arg.message && { message: arg.message }),
                ...(arg.name && { name: arg.name }),
                ...(arg.status && { status: arg.status }),
                ...(arg.code && { code: arg.code }),
                ...(arg.response && { response: 'Response object present' }),
                ...(arg.componentStack && { componentStack: 'Present' }),
                ...(arg.errorBoundary && { errorBoundary: 'Present' }),
                // React error properties
                ...(arg.digest && { digest: arg.digest })
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