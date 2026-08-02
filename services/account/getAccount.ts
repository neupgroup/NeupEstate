/**
 * getAccount.ts
 *
 * Utilities for parsing the auth_account JWT cookie.
 *
 * DEPRECATED: Use @/services/auth instead for new code.
 * This file is kept for backward compatibility.
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
 * NOTE: These helpers only decode the payload without verification.
 *       For verified authentication, use @/services/auth instead.
 */

import { logica } from '@/logica';

export type JwtPayload = {
  aid?: string;
  sid?: string;
  skey?: string;
  nid?: string;
  guest?: boolean | number;
};

export type ActiveAccount = {
  aid: string;
  nid?: string;
  guest?: boolean | number;
};

// ---------------------------------------------------------------------------
// Public helpers (delegating to centralized auth service)
// ---------------------------------------------------------------------------

/**
 * Decode a JWT payload without verifying the signature.
 * 
 * @deprecated Use logica.account.auth.token(token).decode() instead
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  return logica.account.auth.token(token).decode();
}

/**
 * Parses the auth_account JWT cookie value and returns the active account,
 * or null if the token is missing or malformed.
 * 
 * @deprecated Use getClientAccount from @/services/auth instead
 */
export function getActiveAccount(cookieValue: string | null | undefined): ActiveAccount | null {
  if (!cookieValue) return null;
  const payload = logica.account.auth.token(cookieValue.trim()).decode();
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
 * 
 * @deprecated Use isClientAuthenticated from @/services/auth instead
 */
export function hasAuthenticatedSession(cookieValue: string | null | undefined): boolean {
  const account = getActiveAccount(cookieValue);
  return !!account?.aid && !account.guest && !!account.nid;
}

/**
 * Returns true if the auth_account cookie represents any identified account
 * (registered or guest) — i.e. aid is present.
 * 
 * @deprecated Use isClientIdentified from @/services/auth instead
 */
export function hasIdentifiedSession(cookieValue: string | null | undefined): boolean {
  return !!getActiveAccount(cookieValue)?.aid;
}
