/**
 * getAccount.ts
 *
 * Utilities for parsing the auth_account JWT cookie.
 *
 * Cookie name: auth_account (singular, set by NeupID on the shared domain)
 *
 * JWT payload shape:
 *   {
 *     aid   : string   — account ID (always present)
 *     sid   : string   — session ID
 *     skey  : string   — session key
 *     nid?  : string   — NeupID handle (registered accounts only)
 *     guest?: 1        — set to 1 for guest accounts, absent for registered
 *   }
 *
 * NOTE: Signature verification happens in proxy.ts (Edge runtime).
 *       These helpers only decode the payload — do not use them for
 *       security-sensitive decisions; use proxy.ts / get-identity.ts instead.
 */

export type JwtPayload = {
  aid?: string;
  sid?: string;
  skey?: string;
  nid?: string;
  guest?: number;
};

export type ActiveAccount = {
  aid: string;
  nid?: string;
  guest?: number;
};

// ---------------------------------------------------------------------------
// Base64url decode (browser + Node compatible)
// ---------------------------------------------------------------------------

function b64urlDecode(str: string): string {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  return atob(pad ? s + '='.repeat(4 - pad) : s);
}

// ---------------------------------------------------------------------------
// JWT payload decoder (no signature verification — decode only)
// ---------------------------------------------------------------------------

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(b64urlDecode(parts[1]));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Parses the auth_account JWT cookie value and returns the active account,
 * or null if the token is missing or malformed.
 */
export function getActiveAccount(cookieValue: string | null | undefined): ActiveAccount | null {
  if (!cookieValue) return null;
  const payload = decodeJwtPayload(cookieValue.trim());
  if (!payload?.aid) return null;
  return {
    aid:   payload.aid,
    nid:   payload.nid,
    guest: payload.guest,
  };
}

/**
 * Returns true if the auth_account cookie represents a registered
 * (non-guest) account with a valid aid and nid.
 */
export function hasAuthenticatedSession(cookieValue: string | null | undefined): boolean {
  const account = getActiveAccount(cookieValue);
  return !!account?.aid && !account.guest && !!account.nid;
}

/**
 * Returns true if the auth_account cookie represents any identified account
 * (registered or guest) — i.e. aid is present.
 */
export function hasIdentifiedSession(cookieValue: string | null | undefined): boolean {
  return !!getActiveAccount(cookieValue)?.aid;
}
