/**
 * get-identity.ts
 *
 * Server-side identity resolution from the auth_account JWT cookie.
 * Now uses the centralized auth service for JWT verification.
 *
 * Cookie name : auth_account (singular, set by NeupID on the shared domain)
 *
 * JWT payload shape:
 *   { aid, sid, skey, nid?, guest? }
 *   - aid   : account ID (always present — registered and guest)
 *   - nid   : NeupID handle (registered accounts only, absent for guests)
 *   - guest : 1 for guest accounts, absent for registered
 *
 * Result shape:
 *   authenticated: true,  guest: false  → registered account  (aid + nid)
 *   authenticated: true,  guest: true   → guest account       (aid only)
 *   authenticated: false                → no cookie / bad token
 *
 * Usage:
 *   const result = await getIdentity();
 *   if (result.authenticated) {
 *     console.log(result.account.accountId);
 *     console.log(result.guest); // true = guest
 *   }
 */

import { getAuthenticatedAccount, getAuthCookieServer, decodeAuthJWT } from '@/services/auth';

export type IdentityResult =
  | { authenticated: true;  guest: false; account: { accountId: string; nid: string } }
  | { authenticated: true;  guest: true;  account: { accountId: string } }
  | { authenticated: false; reason: string };

/**
 * Resolves the current identity from the auth_account JWT cookie.
 *
 * @param cookieValue - Optional raw cookie value (for Route Handlers that
 *   need to pass it manually). When omitted, reads from the Next.js store.
 */
export async function getIdentity(cookieValue?: string): Promise<IdentityResult> {
  // If a specific cookie value is provided, decode it (for backward compatibility)
  // Otherwise use the centralized auth service
  if (cookieValue !== undefined) {
    const account = decodeAuthJWT(cookieValue);
    
    if (!account) {
      return { authenticated: false, reason: 'no_active_session' };
    }

    if (account.guest === 1) {
      return { authenticated: true, guest: true, account: { accountId: account.aid } };
    }

    if (!account.nid) {
      return { authenticated: false, reason: 'incomplete_session' };
    }

    return {
      authenticated: true,
      guest: false,
      account: { accountId: account.aid, nid: account.nid },
    };
  }

  // Use centralized auth service with verification
  const result = await getAuthenticatedAccount();

  if (!result.success) {
    return { authenticated: false, reason: result.reason };
  }

  const account = result.account;

  if (account.guest === 1) {
    return { authenticated: true, guest: true, account: { accountId: account.aid } };
  }

  if (!account.nid) {
    return { authenticated: false, reason: 'incomplete_session' };
  }

  return {
    authenticated: true,
    guest: false,
    account: { accountId: account.aid, nid: account.nid },
  };
}
