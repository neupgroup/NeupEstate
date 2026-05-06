/**
 * get-identity.ts
 *
 * Server-side helper that reads the auth_accounts cookie, extracts the active
 * session triplet, and verifies it against the NeupID gRPC server.
 *
 * Usage in a Server Component or Server Action:
 *
 *   import { getIdentity } from '@/lib/get-identity';
 *
 *   const result = await getIdentity();
 *   if (!result.authenticated) {
 *     // user is not logged in or session is invalid
 *   } else {
 *     console.log(result.user.accountId);
 *   }
 *
 * Usage in a Route Handler (passing the cookie string manually):
 *
 *   const cookieHeader = request.cookies.get('auth_accounts')?.value;
 *   const result = await getIdentity(cookieHeader);
 */

import { cookies } from 'next/headers';
import { getActiveAccount } from '@/services/account/getAccount';
import { verifySession, type NeupUser } from './verify-session';

export type IdentityResult =
  | { authenticated: true; user: NeupUser }
  | { authenticated: false; reason: string };

/**
 * Resolves the current user's verified identity.
 *
 * @param cookieValue - Optional raw value of the auth_accounts cookie.
 *   When omitted the function reads it from the Next.js cookie store
 *   (only works inside Server Components / Server Actions / Route Handlers).
 */
export async function getIdentity(cookieValue?: string): Promise<IdentityResult> {
  // 1. Read the cookie
  let rawCookie = cookieValue;
  if (rawCookie === undefined) {
    try {
      const cookieStore = await cookies();
      rawCookie = cookieStore.get('auth_accounts')?.value;
    } catch {
      // cookies() throws outside of a request context (e.g. during build)
      return { authenticated: false, reason: 'no_request_context' };
    }
  }

  // 2. Parse the active account from the cookie
  const account = getActiveAccount(rawCookie);
  if (!account) {
    return { authenticated: false, reason: 'no_active_session' };
  }

  // 3. Verify the session triplet via gRPC
  const result = await verifySession({
    sessionId: account.sid,
    sessionKey: account.skey,
    accountId: account.aid,
  });

  if (!result.valid) {
    return { authenticated: false, reason: result.error };
  }

  return { authenticated: true, user: result.user };
}
