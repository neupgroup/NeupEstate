/**
 * get-account-id.ts
 *
 * Shared utilities for resolving the current user's account ID on both
 * client and server, with a consistent priority:
 *
 *   1. auth_accounts cookie  →  use aid from the entry where def === 1
 *   2. temp_account_id cookie  →  anonymous / guest fallback
 *
 * Client usage (inside 'use client' components):
 *   import { getClientAccountId } from '@/lib/get-account-id';
 *   const accountId = getClientAccountId(); // reads document.cookie
 *
 * Server usage (Server Components / Route Handlers):
 *   import { getServerAccountId } from '@/lib/get-account-id';
 *   const accountId = await getServerAccountId(); // reads next/headers cookies
 */

import { getActiveAccount } from '@/services/account/getAccount';

// ---------------------------------------------------------------------------
// Client-side helper (browser only)
// ---------------------------------------------------------------------------

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
 * Prefers the authenticated `aid` from `auth_accounts`; falls back to
 * `temp_account_id` for anonymous users.
 */
export function getClientAccountId(): string | null {
  const active = getActiveAccount(readCookieClient('auth_accounts'));
  if (active?.aid) return active.aid;
  return readCookieClient('temp_account_id');
}

// ---------------------------------------------------------------------------
// Server-side helper (Server Components / Route Handlers / Server Actions)
// ---------------------------------------------------------------------------

/**
 * Returns the resolved account ID on the server side.
 * Prefers the authenticated `aid` from `auth_accounts`; falls back to
 * `temp_account_id` for anonymous users.
 *
 * Must be called inside a request context (Server Component, Server Action,
 * or Route Handler).
 */
export async function getServerAccountId(): Promise<string | null> {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const authRaw = store.get('auth_accounts')?.value;
  const active = getActiveAccount(authRaw);
  if (active?.aid) return active.aid;
  return store.get('temp_account_id')?.value ?? null;
}
