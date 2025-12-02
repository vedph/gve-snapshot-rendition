/**
 * Logger utility for diagnostic output.
 * Logging is controlled by the debug setting in component settings.
 */
export class Logger {
  private enabled: boolean;
  private prefix: string;

  constructor(prefix: string = "GVE", enabled: boolean = false) {
    this.prefix = prefix;
    this.enabled = enabled;
  }

  /**
   * Enable or disable logging.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Log an informational message.
   */
  info(message: string, ...args: any[]): void {
    if (this.enabled) {
      console.log(`[${this.prefix}] ${message}`, ...args);
    }
  }

  /**
   * Log a warning message.
   */
  warn(message: string, ...args: any[]): void {
    if (this.enabled) {
      console.warn(`[${this.prefix}] ${message}`, ...args);
    }
  }

  /**
   * Log an error message (always logged, regardless of debug setting).
   */
  error(message: string, ...args: any[]): void {
    console.error(`[${this.prefix}] ${message}`, ...args);
  }

  /**
   * Log a debug message with detailed context.
   */
  debug(category: string, message: string, data?: any): void {
    if (this.enabled) {
      if (data !== undefined) {
        console.log(`[${this.prefix}:${category}] ${message}`, data);
      } else {
        console.log(`[${this.prefix}:${category}] ${message}`);
      }
    }
  }

  /**
   * Time a block of code execution.
   */
  time(label: string): void {
    if (this.enabled) {
      console.time(`[${this.prefix}] ${label}`);
    }
  }

  /**
   * End timing a block of code.
   */
  timeEnd(label: string): void {
    if (this.enabled) {
      console.timeEnd(`[${this.prefix}] ${label}`);
    }
  }
}
