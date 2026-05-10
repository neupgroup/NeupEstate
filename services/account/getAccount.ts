/**
 * getAccount.ts
 *
 * Cookie parsing utilities for the auth_accounts cookie.
 *
 * New format (set by /api/auth/callback after Silent SSO):
 *   [{ aid: "<ssid>", def: true }]
 *
 * An entry is considered "active" (authenticated) when:
 *   - def === true (boolean) or def === 1 (legacy number)
 *   - aid is a non-empty string
 *
 * If NO entry with def === true exists, the user is not authenticated via
 * Silent SSO and the Silent SSO flow should be triggered.
 */

export type AuthEntry = {
  aid?: string;
  def?: boolean | number;
};

export type ActiveAccount = {
  aid: string;
};

/**
 * Parses the `auth_accounts` cookie and returns the active authenticated
 * account, or null if no authenticated entry exists.
 *
 * "Active" means: an entry where `def === true` (or `def === 1`) and `aid`
 * is a non-empty string.
 */
export function getActiveAccount(cookieValue: string | null | undefined): ActiveAccount | null {
  if (!cookieValue) return null;
  try {
    const entries: AuthEntry[] = JSON.parse(cookieValue);
    const active = entries.find(
      (e) => (e?.def === true || e?.def === 1) && e?.aid
    );
    if (!active?.aid) return null;
    return { aid: active.aid };
  } catch {
    return null;
  }
}

/**
 * Returns true if the auth_accounts cookie contains an authenticated entry.
 * Use this on the client side to decide whether to trigger Silent SSO.
 */
export function hasAuthenticatedSession(cookieValue: string | null | undefined): boolean {
  return getActiveAccount(cookieValue) !== null;
}
