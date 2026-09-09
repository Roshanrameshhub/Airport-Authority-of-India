/**
 * Structured Logger for AAI Asset Management System
 */

const getTimestamp = () => new Date().toISOString();

export const logger = {
  info: (msg, meta = '') => {
    console.log(`[${getTimestamp()}] [INFO] ${msg}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (msg, meta = '') => {
    console.warn(`[${getTimestamp()}] [WARN] ${msg}`, meta ? JSON.stringify(meta) : '');
  },
  error: (msg, error = '') => {
    console.error(`[${getTimestamp()}] [ERROR] ${msg}`, error?.stack || error || '');
  }
};
