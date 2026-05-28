'use server';

import { promises as fsp } from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const API_LOG_FILE = path.join(LOG_DIR, 'api-calls.log');

const SENSITIVE_KEYS = new Set([
  'authorization',
  'app_secret',
  'app-secret',
  'sessionkey',
  'skey',
  'token',
  'password',
  'secret',
]);

function maskIfSensitive(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.has(key.toLowerCase())) return '***REDACTED***';
  return value;
}

function redactRecord(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = redactRecord(value as Record<string, unknown>);
      continue;
    }
    out[key] = maskIfSensitive(key, value);
  }
  return out;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function logApiExchange(input: {
  context: string;
  request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  response?: {
    status: number;
    headers?: Record<string, string>;
    body?: unknown;
  };
  error?: string;
}): Promise<void> {
  const entry = {
    timestamp: new Date().toISOString(),
    context: input.context,
    request: {
      ...input.request,
      headers: input.request.headers ? (redactRecord(input.request.headers) as Record<string, string>) : undefined,
      body:
        input.request.body && typeof input.request.body === 'object'
          ? redactRecord(input.request.body as Record<string, unknown>)
          : input.request.body,
    },
    response: input.response
      ? {
          ...input.response,
          headers: input.response.headers
            ? (redactRecord(input.response.headers) as Record<string, string>)
            : undefined,
          body:
            typeof input.response.body === 'string'
              ? safeJsonParse(input.response.body)
              : input.response.body,
        }
      : undefined,
    error: input.error,
    source: 'api-log-service',
  };

  try {
    await fsp.mkdir(LOG_DIR, { recursive: true });
    await fsp.appendFile(API_LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    console.error('[CRITICAL] Failed to write API log:', error);
  }
}

