/**
 * account.ts
 *
 * Unified authentication service that combines cookie reading and JWT verification.
 * This is the main entry point for all authentication operations.
 *
 * Usage patterns:
 *
 * Server-side (Route Handlers, Server Components, Server Actions):
 *   import { getAuthenticatedAccount } from '@/services/auth/account';
 *   const result = await getAuthenticatedAccount();
 *   if (!result.success) {
 *     // redirect to login
 *   }
 *   // use result.account
 *
 * Client-side:
 *   import { getClientAccount } from '@/services/auth/account';
 *   const account = getClientAccount(); // unverified, decode only
 */

import { redirect } from 'next/navigation';
import { getAuthCookieClient, getAuthCookieServer } from './cookie';
import { verifyAuthJWT, decodeAuthJWT, type AuthAccountPayload } from './jwt';

// ─── Types ───────────────────────────────────────────────────────────────────

export type { AuthAccountPayload } from './jwt';

export type AuthResult =
  | { success: true; account: AuthAccountPayload }
  | { success: false; reason: string; account?: Partial<AuthAccountPayload> };

export type AccountInfo = {
  /** Account ID */
  aid: string;
  /** Session ID */
  sid?: string;
  /** Session key */
  skey?: string;
  /** NeupID handle (registered accounts only) */
  nid?: string;
  /** True if this is a guest account */
  guest: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const NEUP_AUTH_START = 'https://neupgroup.com/account/auth/start';

// ─── Server-side (verified) ──────────────────────────────────────────────────

/**
 * Gets and verifies the authenticated account from the auth_account cookie.
 * This is the primary authentication function for server-side code.
 *
 * Flow:
 *  1. Reads the auth_account cookie from Next.js server context
 *  2. Verifies the JWT signature using AUTH_PUBLIC_KEY
 *  3. Checks expiry and required fields (aid, sid, skey)
 *  4. Returns success: true with verified account, or success: false with reason
 *
 * @returns AuthResult with verified account data or error reason
 */
export async function getAuthenticatedAccount(): Promise<AuthResult> {
  const token = await getAuthCookieServer();

  if (!token) {
    return { success: false, reason: 'no_cookie' };
  }

  const verification = await verifyAuthJWT(token);

  if (!verification.valid) {
    return {
      success: false,
      reason: verification.reason,
      account: verification.payload,
    };
  }

  return {
    success: true,
    account: verification.payload,
  };
}

/**
 * Gets the account ID (aid) from the verified auth_account cookie.
 * Returns null if the cookie is missing, invalid, or verification fails.
 *
 * @returns Account ID or null
 */
export async function getAccountId(): Promise<string | null> {
  const result = await getAuthenticatedAccount();
  return result.success ? result.account.aid : null;
}

/**
 * Gets the session triplet (aid, sid, skey) from the verified auth_account cookie.
 * Returns null if any required field is missing or verification fails.
 *
 * @returns Session triplet or null
 */
export async function getSessionTriplet(): Promise<{ aid: string; sid: string; skey: string } | null> {
  const result = await getAuthenticatedAccount();
  if (!result.success) return null;

  const { aid, sid, skey } = result.account;
  if (!aid || !sid || !skey) return null;

  return { aid, sid, skey };
}

/**
 * Checks if the current session is authenticated (registered, non-guest account).
 * Returns true only if:
 *  - Cookie exists and is valid
 *  - JWT signature is verified
 *  - Account has aid and nid
 *  - Account is not a guest
 *
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const result = await getAuthenticatedAccount();
  if (!result.success) return false;

  const { aid, nid, guest } = result.account;
  return !!aid && !!nid && guest !== 1;
}

/**
 * Checks if the current session is identified (has an account ID).
 * Returns true for both registered and guest accounts.
 *
 * @returns True if identified, false otherwise
 */
export async function isIdentified(): Promise<boolean> {
  const result = await getAuthenticatedAccount();
  return result.success && !!result.account.aid;
}

/**
 * Checks if the current session is a guest account.
 *
 * @returns True if guest, false otherwise
 */
export async function isGuest(): Promise<boolean> {
  const result = await getAuthenticatedAccount();
  return result.success && result.account.guest === 1;
}

/**
 * Gets account information in a simplified format.
 * Returns null if authentication fails.
 *
 * @returns AccountInfo or null
 */
export async function getAccountInfo(): Promise<AccountInfo | null> {
  const result = await getAuthenticatedAccount();
  if (!result.success) return null;

  const { aid, sid, skey, nid, guest } = result.account;
  return {
    aid,
    sid,
    skey,
    nid,
    guest: guest === 1,
  };
}

/**
 * Requires authentication and automatically redirects to NeupID login if not authenticated.
 * This is the simplest way to protect a page or API route.
 *
 * If authentication succeeds, returns the verified account payload.
 * If authentication fails, redirects to neupgroup.com/account/auth/start and never returns.
 *
 * Usage in Server Components:
 *   const account = await requireAuth();
 *   // account is guaranteed to be authenticated here
 *
 * Usage in Route Handlers:
 *   const account = await requireAuth(request);
 *   // account is guaranteed to be authenticated here
 *
 * @param request - Optional Next.js request object (for building redirectsTo URL)
 * @returns Verified account payload (never returns if not authenticated)
 */
export async function requireAuth(request?: { url?: string; nextUrl?: { href?: string } }): Promise<AuthAccountPayload> {
  const result = await getAuthenticatedAccount();

  if (!result.success) {
    // Build the redirect URL with the current page as redirectsTo
    let redirectUrl = NEUP_AUTH_START;

    if (request) {
      const currentUrl = request.nextUrl?.href || request.url;
      if (currentUrl) {
        redirectUrl = `${NEUP_AUTH_START}?redirectsTo=${encodeURIComponent(currentUrl)}`;
      }
    }

    redirect(redirectUrl);
  }

  return result.account;
}

/**
 * Requires a registered (non-guest) authenticated account.
 * Redirects to NeupID login if not authenticated or if the account is a guest.
 *
 * Usage:
 *   const account = await requireRegisteredAuth();
 *   // account is guaranteed to be a registered user (not guest)
 *
 * @param request - Optional Next.js request object (for building redirectsTo URL)
 * @returns Verified registered account payload (never returns if not authenticated or guest)
 */
export async function requireRegisteredAuth(request?: { url?: string; nextUrl?: { href?: string } }): Promise<AuthAccountPayload> {
  const result = await getAuthenticatedAccount();

  if (!result.success || result.account.guest === 1 || !result.account.nid) {
    // Build the redirect URL with the current page as redirectsTo
    let redirectUrl = NEUP_AUTH_START;

    if (request) {
      const currentUrl = request.nextUrl?.href || request.url;
      if (currentUrl) {
        redirectUrl = `${NEUP_AUTH_START}?redirectsTo=${encodeURIComponent(currentUrl)}`;
      }
    }

    redirect(redirectUrl);
  }

  return result.account;
}

// ─── Client-side (unverified, decode only) ───────────────────────────────────

/**
 * Gets the account data from the auth_account cookie (client-side).
 * 
 * WARNING: This only decodes the JWT without verifying the signature.
 * Do NOT use this for security-critical decisions.
 * Use server-side functions for authentication/authorization.
 *
 * @returns Decoded account payload or null
 */
export function getClientAccount(): AuthAccountPayload | null {
  const token = getAuthCookieClient();
  return decodeAuthJWT(token);
}

/**
 * Gets the account ID from the client-side cookie (unverified).
 *
 * WARNING: This is unverified. Do not use for security decisions.
 *
 * @returns Account ID or null
 */
export function getClientAccountId(): string | null {
  const account = getClientAccount();
  return account?.aid ?? null;
}

/**
 * Checks if the client has an authenticated session (unverified).
 *
 * WARNING: This is unverified. Do not use for security decisions.
 *
 * @returns True if appears authenticated, false otherwise
 */
export function isClientAuthenticated(): boolean {
  const account = getClientAccount();
  return !!account?.aid && !!account.nid && account.guest !== 1;
}

/**
 * Checks if the client has any identified session (unverified).
 *
 * WARNING: This is unverified. Do not use for security decisions.
 *
 * @returns True if appears identified, false otherwise
 */
export function isClientIdentified(): boolean {
  const account = getClientAccount();
  return !!account?.aid;
}
