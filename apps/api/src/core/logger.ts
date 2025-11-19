import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Ensure directory exists for log files
 */
const ensureLogDirectory = (filePath: string): void => {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if exists
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  // Add stack trace if error
  if (stack) {
    msg += `\n${stack}`;
  }

  return msg;
});

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(errors({ stack: true }), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  const logPath = process.env.LOG_FILE_PATH || './logs';

  // Ensure log directory exists
  ensureLogDirectory(`${logPath}/placeholder.log`);

  // Error logs
  logger.add(
    new DailyRotateFile({
      filename: `${logPath}/error-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
    })
  );

  // Combined logs
  logger.add(
    new DailyRotateFile({
      filename: `${logPath}/combined-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
    })
  );
}

// Handle uncaught exceptions and unhandled rejections
// Ensure logs directory exists for exception/rejection handlers
ensureLogDirectory('logs/exceptions.log');
ensureLogDirectory('logs/rejections.log');

logger.exceptions.handle(new winston.transports.File({ filename: 'logs/exceptions.log' }));

logger.rejections.handle(new winston.transports.File({ filename: 'logs/rejections.log' }));
