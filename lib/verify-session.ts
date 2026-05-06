/**
 * verify-session.ts
 *
 * Typed wrapper around the NeupID gRPC Verify RPC.
 * Server-only — never call this from browser code.
 */

import { authClient } from './neupid-grpc';

export type NeupUser = {
  accountId: string;
  neupId: string;
  displayName: string;
  displayImage: string;
  accountType: string;
  verified: boolean;
};

export type VerifyResult =
  | { valid: true; user: NeupUser }
  | { valid: false; error: string };

/**
 * Calls the NeupID gRPC AuthService.Verify with the session triplet extracted
 * from the auth_accounts cookie.
 *
 * @param input - { sessionId, sessionKey, accountId } from the active account
 * @returns VerifyResult — either { valid: true, user } or { valid: false, error }
 */
export function verifySession(input: {
  sessionId: string;
  sessionKey: string;
  accountId: string;
}): Promise<VerifyResult> {
  return new Promise((resolve) => {
    authClient.Verify(input, (err: Error | null, response: any) => {
      if (err) {
        resolve({ valid: false, error: err.message });
        return;
      }
      if (response?.valid) {
        resolve({ valid: true, user: response.user as NeupUser });
      } else {
        resolve({ valid: false, error: response?.error || 'invalid_session' });
      }
    });
  });
}
