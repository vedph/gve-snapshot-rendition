/**
 * Logger utility for diagnostic output.
 * Logging is controlled by the debug setting in component settings.
 */
export class Logger {
  private _enabled: boolean;
  private _prefix: string;

  constructor(prefix: string = "GVE", enabled: boolean = false) {
    this._prefix = prefix;
    this._enabled = enabled;
  }

  /**
   * Enable or disable logging.
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * Log an informational message.
   */
  info(message: string, ...args: any[]): void {
    if (this._enabled) {
      console.log(`[${this._prefix}] ${message}`, ...args);
    }
  }

  /**
   * Log a warning message.
   */
  warn(message: string, ...args: any[]): void {
    if (this._enabled) {
      console.warn(`[${this._prefix}] ${message}`, ...args);
    }
  }

  /**
   * Log an error message (always logged, regardless of debug setting).
   */
  error(message: string, ...args: any[]): void {
    console.error(`[${this._prefix}] ${message}`, ...args);
  }

  /**
   * Log a debug message with detailed context.
   */
  debug(category: string, message: string, data?: any): void {
    if (this._enabled) {
      if (data !== undefined) {
        console.log(`[${this._prefix}:${category}] ${message}`, data);
      } else {
        console.log(`[${this._prefix}:${category}] ${message}`);
      }
    }
  }

  /**
   * Time a block of code execution.
   */
  time(label: string): void {
    if (this._enabled) {
      console.time(`[${this._prefix}] ${label}`);
    }
  }

  /**
   * End timing a block of code.
   */
  timeEnd(label: string): void {
    if (this._enabled) {
      console.timeEnd(`[${this._prefix}] ${label}`);
    }
  }
}
