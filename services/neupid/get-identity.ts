/**
 * get-identity.ts
 *
 * Server-side identity resolution using the new Silent SSO cookie format.
 *
 * The `auth_accounts` cookie is set by /api/auth/callback after a successful
 * NeupID code exchange. It contains a JSON array with at least one entry:
 *   [{ aid: "<ssid>", def: true }]
 *
 * If an entry with `def === true` exists, the user is authenticated — no
 * external call needed. The `aid` is the stable ssid from NeupID.
 *
 * Usage in a Server Component or Server Action:
 *
 *   const result = await getIdentity();
 *   if (result.authenticated) {
 *     console.log(result.user.accountId); // the ssid
 *   }
 */

import { cookies } from 'next/headers';

export type NeupUser = {
  accountId: string; // ssid from NeupID
};

export type IdentityResult =
  | { authenticated: true; user: NeupUser }
  | { authenticated: false; reason: string };

type AuthEntry = {
  aid?: string;
  def?: boolean | number;
};

/**
 * Parses the auth_accounts cookie and returns the authenticated account ID
 * if an entry with def === true exists.
 */
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
 * Resolves the current user's identity from the auth_accounts cookie.
 * No external calls — purely cookie-based.
 *
 * @param cookieValue - Optional raw cookie value (for Route Handlers).
 *   When omitted, reads from the Next.js cookie store.
 */
export async function getIdentity(cookieValue?: string): Promise<IdentityResult> {
  let rawCookie = cookieValue;

  if (rawCookie === undefined) {
    try {
      const cookieStore = await cookies();
      rawCookie = cookieStore.get('auth_accounts')?.value;
    } catch {
      return { authenticated: false, reason: 'no_request_context' };
    }
  }

  const accountId = parseAuthCookie(rawCookie);
  if (!accountId) {
    return { authenticated: false, reason: 'no_active_session' };
  }

  return { authenticated: true, user: { accountId } };
}
