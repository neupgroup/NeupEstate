/**
 * get-account-id.ts
 *
 * Utilities for resolving the current user's account ID from the
 * auth_account JWT cookie (set by NeupID on the shared domain).
 *
 * DEPRECATED: Use @/services/auth instead for new code.
 * This file is kept for backward compatibility.
 *
 * Client usage:
 *   import { getClientAccountId } from '@/services/auth';
 *   const accountId = getClientAccountId(); // string | null
 *
 * Server usage:
 *   import { getAccountId } from '@/services/auth';
 *   const accountId = await getAccountId(); // string | null
 */

import { 
  getClientAccountId as getClientAccountIdNew,
  isClientAuthenticated as isClientAuthenticatedNew,
  isClientIdentified as isClientIdentifiedNew,
} from '@/services/auth/client';
import { getAccountId as getServerAccountIdNew } from '@/services/auth/account';

// ─── Client-side ─────────────────────────────────────────────────────────────

/**
 * Returns the account ID (aid) from the auth_account JWT cookie.
 * Works for both registered and guest accounts.
 * Returns null if no cookie is present or the token is malformed.
 * 
 * @deprecated Use getClientAccountId from @/services/auth instead
 */
export function getClientAccountId(): string | null {
  return getClientAccountIdNew();
}

/**
 * Returns true if the current browser session has a registered
 * (non-guest) authenticated account.
 * 
 * @deprecated Use isClientAuthenticated from @/services/auth instead
 */
export function isClientAuthenticated(): boolean {
  return isClientAuthenticatedNew();
}

/**
 * Returns true if the current browser session has any identified account
 * (registered or guest).
 * 
 * @deprecated Use isClientIdentified from @/services/auth instead
 */
export function isClientIdentified(): boolean {
  return isClientIdentifiedNew();
}

// ─── Server-side ─────────────────────────────────────────────────────────────

/**
 * Returns the account ID (aid) from the auth_account JWT cookie.
 * Works for both registered and guest accounts.
 * Returns null if no cookie is present or the token is malformed.
 * 
 * @deprecated Use getAccountId from @/services/auth instead
 */
export async function getServerAccountId(): Promise<string | null> {
  return await getServerAccountIdNew();
}
