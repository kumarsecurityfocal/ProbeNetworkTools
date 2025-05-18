/**
 * Enhanced logging for the Express server
 * 
 * This module provides structured logging for the ProbeOps Express server
 * with support for file-based logging and rotation.
 */

const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

// Define log directory - use environment variable or default to current directory
const LOG_DIR = process.env.LOG_DIR || path.join(process.env.APP_DIR || __dirname, 'logs', 'express');

// Create log directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Configure file transport with rotation
const fileTransport = new transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'express-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: format.combine(
    format.timestamp(),
    format.json()
  )
});

// Configure auth log transport with rotation
const authTransport = new transports.DailyRotateFile({
  filename: path.join(LOG_DIR, 'auth-debug-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: format.combine(
    format.timestamp(),
    format.json()
  )
});

// Create the logger
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'express-server' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    }),
    fileTransport
  ]
});

// Create auth logger
const authLogger = createLogger({
  level: 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'auth' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    }),
    authTransport
  ]
});

// Helper function for authentication logging
function logAuth(message, data = {}) {
  if (typeof message !== 'string') {
    data = message;
    message = 'Authentication event';
  }
  
  authLogger.debug(message, data);
  
  // For backward compatibility, still write to the file directly if configured
  // This ensures any existing code still works
  const backwardCompatPath = process.env.AUTH_DEBUG_LOG || path.join(LOG_DIR, 'auth-debug.log');
  try {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] ${message} ${JSON.stringify(data)}\n`;
    fs.appendFileSync(backwardCompatPath, formattedMessage);
  } catch (error) {
    logger.error('Failed to write to backward compatible auth log', { error: error.message });
  }
}

module.exports = {
  logger,
  authLogger,
  logAuth
};