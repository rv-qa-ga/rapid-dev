import * as fs from 'fs';
import * as path from 'path';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

class Logger {
  private logDir: string;
  private logFile: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(this.logDir, `test-run-${timestamp}.log`);
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  private writeToFile(message: string): void {
    try {
      fs.appendFileSync(this.logFile, message + '\n', 'utf-8');
    } catch (error) {
      // Silently fail if logging fails
    }
  }

  debug(message: string, ...args: any[]): void {
    const formatted = this.formatMessage(LogLevel.DEBUG, message, ...args);
    console.debug(formatted);
    this.writeToFile(formatted);
  }

  info(message: string, ...args: any[]): void {
    const formatted = this.formatMessage(LogLevel.INFO, message, ...args);
    console.log(formatted);
    this.writeToFile(formatted);
  }

  warn(message: string, ...args: any[]): void {
    const formatted = this.formatMessage(LogLevel.WARN, message, ...args);
    console.warn(formatted);
    this.writeToFile(formatted);
  }

  error(message: string, ...args: any[]): void {
    const formatted = this.formatMessage(LogLevel.ERROR, message, ...args);
    console.error(formatted);
    this.writeToFile(formatted);
  }
}

export const logger = new Logger();

