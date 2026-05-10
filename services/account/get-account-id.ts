/**
 * get-account-id.ts
 *
 * Utilities for resolving the current user's account ID on both client and server.
 *
 * Priority:
 *   1. auth_accounts cookie with def === true  →  authenticated user (ssid)
 *   2. temp_account_id cookie                  →  anonymous guest fallback
 *
 * Client usage:
 *   import { getClientAccountId } from '@/services/account/get-account-id';
 *   const accountId = getClientAccountId();
 *
 * Server usage:
 *   import { getServerAccountId } from '@/services/account/get-account-id';
 *   const accountId = await getServerAccountId();
 */

import { getActiveAccount } from '@/services/account/getAccount';

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
 * Returns the resolved account ID on the client side.
 * Prefers the authenticated ssid from auth_accounts; falls back to
 * temp_account_id for anonymous users.
 */
export function getClientAccountId(): string | null {
  const active = getActiveAccount(readCookieClient('auth_accounts'));
  if (active?.aid) return active.aid;
  return readCookieClient('temp_account_id');
}

/**
 * Returns true if the current browser session has an authenticated account
 * (i.e. auth_accounts cookie has an entry with def === true).
 * Use this to decide whether to trigger Silent SSO.
 */
export function isClientAuthenticated(): boolean {
  const active = getActiveAccount(readCookieClient('auth_accounts'));
  return !!active?.aid;
}

// ─── Server-side ─────────────────────────────────────────────────────────────

/**
 * Returns the resolved account ID on the server side.
 * Prefers the authenticated ssid from auth_accounts; falls back to
 * temp_account_id for anonymous users.
 */
export async function getServerAccountId(): Promise<string | null> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const authRaw = store.get('auth_accounts')?.value;
  const active = getActiveAccount(authRaw);
  if (active?.aid) return active.aid;
  return store.get('temp_account_id')?.value ?? null;
}
