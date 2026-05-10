/**
 * get-account-id.ts
 *
 * Utilities for resolving the current user's account ID from the
 * auth_account JWT cookie (set by NeupID on the shared domain).
 *
 * Client usage:
 *   import { getClientAccountId } from '@/services/account/get-account-id';
 *   const accountId = getClientAccountId(); // string | null
 *
 * Server usage:
 *   import { getServerAccountId } from '@/services/account/get-account-id';
 *   const accountId = await getServerAccountId(); // string | null
 */

import { getActiveAccount } from '@/services/account/getAccount';

const COOKIE_NAME = 'auth_account';

// ─── Client-side ─────────────────────────────────────────────────────────────

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
 * Returns the account ID (aid) from the auth_account JWT cookie.
 * Works for both registered and guest accounts.
 * Returns null if no cookie is present or the token is malformed.
 */
export function getClientAccountId(): string | null {
  const account = getActiveAccount(readCookieClient(COOKIE_NAME));
  return account?.aid ?? null;
}

/**
 * Returns true if the current browser session has a registered
 * (non-guest) authenticated account.
 */
export function isClientAuthenticated(): boolean {
  const account = getActiveAccount(readCookieClient(COOKIE_NAME));
  return !!account?.aid && !account.guest && !!account.nid;
}

/**
 * Returns true if the current browser session has any identified account
 * (registered or guest).
 */
export function isClientIdentified(): boolean {
  return !!getActiveAccount(readCookieClient(COOKIE_NAME))?.aid;
}

// ─── Server-side ─────────────────────────────────────────────────────────────

/**
 * Returns the account ID (aid) from the auth_account JWT cookie.
 * Works for both registered and guest accounts.
 * Returns null if no cookie is present or the token is malformed.
 */
export async function getServerAccountId(): Promise<string | null> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return getActiveAccount(raw)?.aid ?? null;
}
