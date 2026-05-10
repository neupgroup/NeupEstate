/**
 * get-identity.ts
 *
 * Server-side identity resolution using the Silent SSO cookie format.
 *
 * The `auth_accounts` cookie is set by /api/auth/callback after a successful
 * NeupID code exchange:
 *   [{ aid: "<ssid>", def: true }]
 *
 * Guest accounts are resolved from the `temp_account_id` cookie. Their IDs
 * follow the `track.*` prefix convention set by account-service.ts.
 *
 * Both authenticated and guest sessions return authenticated: true.
 * Use the `guest` flag to distinguish between them.
 *
 * Usage:
 *   const result = await getIdentity();
 *   if (result.authenticated) {
 *     console.log(result.account.accountId); // the ssid or track.* id
 *     console.log(result.guest);             // true if guest session
 *   }
 */

import { cookies } from 'next/headers';

export type IdentityResult =
  | { authenticated: true;  guest: false; account: { accountId: string } }
  | { authenticated: true;  guest: true;  account: { accountId: string } }
  | { authenticated: false; reason: string };

type AuthEntry = {
  aid?: string;
  def?: boolean | number;
};

function parseAuthCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const entries: AuthEntry[] = JSON.parse(raw);
    const active = entries.find(
      (e) => e?.def === true || e?.def === 1
    );
    return active?.aid ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves the current identity from cookies.
 *
 * Priority:
 *   1. auth_accounts cookie (def === true)  →  authenticated, guest: false
 *   2. temp_account_id cookie (track.* id)  →  authenticated, guest: true
 *   3. Neither present                       →  authenticated: false
 *
 * @param authCookieValue  - Optional raw auth_accounts value (for Route Handlers).
 * @param tempCookieValue  - Optional raw temp_account_id value (for Route Handlers).
 *   When omitted, both are read from the Next.js cookie store.
 */
export async function getIdentity(
  authCookieValue?: string,
  tempCookieValue?: string,
): Promise<IdentityResult> {
  let rawAuth = authCookieValue;
  let rawTemp = tempCookieValue;

  if (rawAuth === undefined || rawTemp === undefined) {
    try {
      const cookieStore = await cookies();
      if (rawAuth === undefined) rawAuth = cookieStore.get('auth_accounts')?.value;
      if (rawTemp === undefined) rawTemp = cookieStore.get('temp_account_id')?.value;
    } catch {
      return { authenticated: false, reason: 'no_request_context' };
    }
  }

  // 1. Authenticated session
  const accountId = parseAuthCookie(rawAuth);
  if (accountId) {
    return { authenticated: true, guest: false, account: { accountId } };
  }

  // 2. Guest session
  const guestId = rawTemp?.trim();
  if (guestId && guestId.startsWith('track.')) {
    return { authenticated: true, guest: true, account: { accountId: guestId } };
  }

  return { authenticated: false, reason: 'no_active_session' };
}
