/**
 * get-identity.ts
 *
 * Server-side identity resolution from the auth_account JWT cookie.
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

import { cookies } from 'next/headers';
import { getActiveAccount } from '@/services/account/getAccount';

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
  let raw = cookieValue;

  if (raw === undefined) {
    try {
      const store = await cookies();
      raw = store.get('auth_account')?.value;
    } catch {
      return { authenticated: false, reason: 'no_request_context' };
    }
  }

  const account = getActiveAccount(raw);

  if (!account) {
    return { authenticated: false, reason: 'no_active_session' };
  }

  if (account.guest === 1) {
    return { authenticated: true, guest: true, account: { accountId: account.aid } };
  }

  if (!account.nid) {
    // aid present but no nid and not flagged as guest — treat as unverified
    return { authenticated: false, reason: 'incomplete_session' };
  }

  return {
    authenticated: true,
    guest: false,
    account: { accountId: account.aid, nid: account.nid },
  };
}
