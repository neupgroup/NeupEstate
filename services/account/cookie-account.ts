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
  verifyAuthJWT,
  type AuthAccountPayload,
  type JWTVerifyResult,
} from '@/services/auth';

// ---------------------------------------------------------------------------
// Types (re-exported for backward compatibility)
// ---------------------------------------------------------------------------

export type CookieAccountPayload = AuthAccountPayload;

export type { JWTVerifyResult };

export type AccountFromCookieResult =
  | { success: true;  account: CookieAccountPayload }
  | { success: false; account: Partial<CookieAccountPayload> | null; reason: string };

// ---------------------------------------------------------------------------
// Public API (delegating to centralized auth service)
// ---------------------------------------------------------------------------

/**
 * Verifies the JWT signature of the auth_account cookie value using the
 * RSA public key from AUTH_PUBLIC_KEY (RS256).
 *
 * Also checks that the token is not expired.
 * 
 * @deprecated Use verifyAuthJWT from @/services/auth instead
 */
export async function verifyAccountJWT(token: string | null | undefined): Promise<JWTVerifyResult> {
  return await verifyAuthJWT(token);
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
    const verification = await verifyAuthJWT(token);
    
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
