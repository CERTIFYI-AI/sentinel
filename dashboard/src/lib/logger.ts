/**
 * Production-safe logger utility.
 * In production builds, all log output is suppressed to prevent
 * accidental information leakage via browser console.
 */
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn: (...args: unknown[]) => { if (isDev) console.warn(...args); },
  error: (...args: unknown[]) => { if (isDev) console.error(...args); },
  debug: (...args: unknown[]) => { if (isDev) console.debug(...args); },
};

export default logger;
