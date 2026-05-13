/**
 * cookie.ts
 *
 * Centralized cookie reading service for auth_account cookie.
 * Handles both client-side and server-side cookie access.
 */

import { logCookieError } from './logger';

const COOKIE_NAME = 'auth_account';

// ─── Client-side cookie reading ──────────────────────────────────────────────

/**
 * Reads a cookie value from document.cookie (client-side only).
 * Returns null if the cookie is not found or if running on the server.
 */
function readCookieClient(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  for (let c of document.cookie.split(';')) {
    c = c.trim();
    if (c.startsWith(nameEQ)) return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}

/**
 * Reads the auth_account cookie value from the browser.
 * Returns null if not found or if running on the server.
 */
export function getAuthCookieClient(): string | null {
  return readCookieClient(COOKIE_NAME);
}

// ─── Server-side cookie reading ──────────────────────────────────────────────

/**
 * Reads the auth_account cookie value from Next.js server context.
 * Returns null if not found.
 * 
 * Must be called from Server Components, Route Handlers, or Server Actions.
 */
export async function getAuthCookieServer(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers');
    const store = await cookies();
    return store.get(COOKIE_NAME)?.value ?? null;
  } catch (error) {
    await logCookieError(error as Error);
    return null;
  }
}
