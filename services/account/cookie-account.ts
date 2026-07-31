/**
 * cookie-account.ts
 *
 * Two-step server-side auth helper for the auth_account JWT cookie.
 *
 * DEPRECATED: Use @/services/auth instead for new code.
 * This file is kept for backward compatibility.
 *
 * New usage:
 *   import { getAuthenticatedAccount } from '@/services/auth';
 *   const result = await getAuthenticatedAccount();
 *   if (!result.success) {
 *     // redirect to NeupID login
 *   }
 *   // result.account is fully typed and signature-verified
 */

import { 
  getAuthenticatedAccount,
  type AuthAccountPayload,
} from '@/services/auth';
import { verifyNeupIdToken } from '@/logica/neupid/token/verify';

// ---------------------------------------------------------------------------
// Types (re-exported for backward compatibility)
// ---------------------------------------------------------------------------

export type CookieAccountPayload = AuthAccountPayload;

export type JWTVerifyResult =
  | { valid: true; payload: CookieAccountPayload }
  | { valid: false; reason: string; payload?: Partial<CookieAccountPayload> };

export type AccountFromCookieResult =
  | { success: true;  account: CookieAccountPayload }
  | { success: false; account: Partial<CookieAccountPayload> | null; reason: string };

// ---------------------------------------------------------------------------
// Public API (delegating to centralized auth service)
// ---------------------------------------------------------------------------

/**
 * Verifies the auth_account cookie value through logica's NeupID token helper.
 *
 * Also checks that the token is not expired.
 * 
 * @deprecated Use getAuthenticatedAccount from @/services/auth instead
 */
export async function verifyAccountJWT(token: string | null | undefined): Promise<JWTVerifyResult> {
  const verification = await verifyNeupIdToken(token);
  if (!verification.valid) {
    return {
      valid: false,
      reason: verification.reason,
      payload: verification.payload as Partial<CookieAccountPayload> | undefined,
    };
  }

  if (!verification.payload.aid) {
    return {
      valid: false,
      reason: 'missing_aid',
      payload: verification.payload as Partial<CookieAccountPayload>,
    };
  }

  return { valid: true, payload: verification.payload as CookieAccountPayload };
}

/**
 * Full two-step account resolution from the auth_account cookie value.
 *
 * 1. Runs verifyAccountJWT — if the signature is invalid or token is missing,
 *    returns success: false so the caller can redirect to NeupID login.
 * 2. If valid, returns success: true with the verified account payload.
 *
 * @param token  Raw value of the auth_account cookie (or null/undefined).
 * @deprecated Use getAuthenticatedAccount from @/services/auth instead
 */
export async function getAccountFromCookie(
  token: string | null | undefined,
): Promise<AccountFromCookieResult> {
  // If token is provided, verify it directly
  if (token !== undefined && token !== null) {
    const verification = await verifyAccountJWT(token);
    
    if (!verification.valid) {
      return {
        success: false,
        account: verification.payload ?? null,
        reason: verification.reason,
      };
    }

    return {
      success: true,
      account: verification.payload,
    };
  }

  // Otherwise use the centralized service
  const result = await getAuthenticatedAccount();
  
  if (!result.success) {
    return {
      success: false,
      account: result.account ?? null,
      reason: result.reason,
    };
  }

  return {
    success: true,
    account: result.account,
  };
}
