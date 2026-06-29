/**
 * logger.ts
 *
 * Authentication error logging service.
 * Logs errors to both console and file system.
 * 
 * Note: File logging only works in Node.js runtime (Server Components, Route Handlers, Server Actions).
 * Edge runtime and client-side will only log to console.
 */

import { logProblem } from '@/services/problem-service';

// ─── Configuration ───────────────────────────────────────────────────────────

const LOG_DIR = 'logs';
const AUTH_LOG_FILE = 'logs/auth-errors.log';
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

// ─── Runtime Detection ───────────────────────────────────────────────────────

const isServer = typeof window === 'undefined';
const isNodeRuntime = isServer && typeof process !== 'undefined' && process.versions?.node;

// ─── Types ───────────────────────────────────────────────────────────────────

type LogLevel = 'error' | 'warn' | 'info';

interface AuthErrorLog {
  timestamp: string;
  level: LogLevel;
  error: string;
  reason?: string;
  token?: string; // Truncated for security
  stack?: string;
  context?: Record<string, any>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Ensures the log directory exists.
 */
async function ensureLogDirectory(): Promise<void> {
  if (!isNodeRuntime) return;

  try {
    const fs = await import('fs');
    const path = await import('path');
    const logDir = path.join(process.cwd(), LOG_DIR);

    if (!fs.existsSync(logDir)) {
      const fsp = await import('fs/promises');
      await fsp.mkdir(logDir, { recursive: true });
    }
  } catch (error) {
    console.error('[Auth Logger] Failed to create log directory:', error);
  }
}

/**
 * Truncates a JWT token for safe logging (shows first/last 10 chars).
 */
function truncateToken(token: string | null | undefined): string {
  if (!token) return 'null';
  if (token.length <= 20) return '***';
  return `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
}

/**
 * Formats a log entry as a JSON string.
 */
function formatLogEntry(log: AuthErrorLog): string {
  return JSON.stringify(log) + '\n';
}

function getPrintableContext(
  context?: {
    reason?: string;
    token?: string | null;
    level?: LogLevel;
    [key: string]: any;
  },
): Record<string, any> | undefined {
  if (!context) return undefined;

  const { reason: _reason, token: _token, level: _level, ...rest } = context;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

/**
 * Rotates the log file if it exceeds MAX_LOG_SIZE.
 */
async function rotateLogIfNeeded(): Promise<void> {
  if (!isNodeRuntime) return;

  try {
    const fs = await import('fs');
    const path = await import('path');
    const logFile = path.join(process.cwd(), AUTH_LOG_FILE);

    if (!fs.existsSync(logFile)) return;

    const fsp = await import('fs/promises');
    const stats = await fsp.stat(logFile).catch(() => null);

    if (stats && stats.size > MAX_LOG_SIZE) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const archivePath = path.join(process.cwd(), LOG_DIR, `auth-errors-${timestamp}.log`);
      
      await fsp.rename(logFile, archivePath);
      
      console.log(`[Auth Logger] Rotated log file to ${archivePath}`);
    }
  } catch (error) {
    console.error('[Auth Logger] Failed to rotate log file:', error);
  }
}

/**
 * Writes a log entry to the file system.
 */
async function writeToFile(log: AuthErrorLog): Promise<void> {
  if (!isNodeRuntime) return;

  try {
    await ensureLogDirectory();
    await rotateLogIfNeeded();
    
    const path = await import('path');
    const fsp = await import('fs/promises');
    const logFile = path.join(process.cwd(), AUTH_LOG_FILE);
    
    const logEntry = formatLogEntry(log);
    await fsp.appendFile(logFile, logEntry, 'utf-8');
  } catch (error) {
    console.error('[Auth Logger] Failed to write to log file:', error);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Logs an authentication error to both console and file.
 *
 * @param error - Error message or Error object
 * @param context - Additional context (reason, token, etc.)
 */
export async function logAuthError(
  error: string | Error,
  context?: {
    reason?: string;
    token?: string | null;
    level?: LogLevel;
    [key: string]: any;
  }
): Promise<void> {
  const timestamp = new Date().toISOString();
  const level = context?.level || 'error';
  const errorMessage = error instanceof Error ? error.message : error;
  const stack = error instanceof Error ? error.stack : undefined;
  const printableContext = getPrintableContext(context);

  const log: AuthErrorLog = {
    timestamp,
    level,
    error: errorMessage,
    reason: context?.reason,
    token: truncateToken(context?.token),
    stack,
    context: context ? { ...context, token: undefined } : undefined,
  };

  switch (level) {
    case 'error':
      break;
    case 'warn':
      break;
    case 'info':
      break;
  }

  if (level === 'error') {
    await logProblem(
      error instanceof Error ? error : new Error(errorMessage),
      'auth.logger',
      {
        reason: context?.reason,
        operation: context?.operation,
        token: truncateToken(context?.token),
        authContext: context ? { ...context, token: undefined, level } : { level },
      },
    );
  }

  // Log to file (only in Node.js runtime, async, don't block)
  if (isNodeRuntime) {
    writeToFile(log).catch(err => {
      console.error('[Auth Logger] Failed to write log:', err);
    });
  }
}

/**
 * Logs a JWT verification error.
 */
export async function logJWTVerificationError(
  reason: string,
  token: string | null | undefined,
  error?: Error
): Promise<void> {
  await logAuthError(
    error || `JWT verification failed: ${reason}`,
    {
      reason,
      token,
      level: 'error',
      operation: 'jwt_verification',
    }
  );
}

/**
 * Logs a JWT decoding error.
 */
export async function logJWTDecodingError(
  token: string | null | undefined,
  error: Error
): Promise<void> {
  await logAuthError(error, {
    reason: 'jwt_decode_failed',
    token,
    level: 'error',
    operation: 'jwt_decoding',
  });
}

/**
 * Logs a cookie reading error.
 */
export async function logCookieError(error: Error): Promise<void> {
  await logAuthError(error, {
    reason: 'cookie_read_failed',
    level: 'error',
    operation: 'cookie_reading',
  });
}

/**
 * Logs an authentication warning (non-critical).
 */
export async function logAuthWarning(
  message: string,
  context?: Record<string, any>
): Promise<void> {
  await logAuthError(message, {
    ...context,
    level: 'warn',
  });
}

/**
 * Logs authentication info (for debugging).
 */
export async function logAuthInfo(
  message: string,
  context?: Record<string, any>
): Promise<void> {
  await logAuthError(message, {
    ...context,
    level: 'info',
  });
}

/**
 * Reads the last N lines from the auth error log.
 * Useful for debugging and monitoring.
 */
export async function readAuthLogs(lines: number = 100): Promise<string[]> {
  if (!isNodeRuntime) {
    console.warn('[Auth Logger] File reading not available in this runtime');
    return [];
  }

  try {
    const fs = await import('fs');
    const path = await import('path');
    const logFile = path.join(process.cwd(), AUTH_LOG_FILE);

    if (!fs.existsSync(logFile)) {
      return [];
    }

    const fsp = await import('fs/promises');
    const content = await fsp.readFile(logFile, 'utf-8');
    const allLines = content.trim().split('\n');
    
    return allLines.slice(-lines);
  } catch (error) {
    console.error('[Auth Logger] Failed to read log file:', error);
    return [];
  }
}

/**
 * Clears the auth error log file.
 * Use with caution!
 */
export async function clearAuthLogs(): Promise<void> {
  if (!isNodeRuntime) {
    console.warn('[Auth Logger] File operations not available in this runtime');
    return;
  }

  try {
    const fs = await import('fs');
    const path = await import('path');
    const logFile = path.join(process.cwd(), AUTH_LOG_FILE);

    if (fs.existsSync(logFile)) {
      const fsp = await import('fs/promises');
      await fsp.writeFile(logFile, '', 'utf-8');
      console.log('[Auth Logger] Cleared auth error log');
    }
  } catch (error) {
    console.error('[Auth Logger] Failed to clear log file:', error);
  }
}
