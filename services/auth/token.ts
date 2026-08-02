/**
 * ::neup.documentation::service-auth-token
 * ::title Account Auth Token Facade
 *
 * Small estate-side adapter for account auth token operations.
 *
 * ::public
 *
 * Use this service when estate code needs auth-account token validation or
 * decode-only reads while the root Logica facade does not yet expose
 * `logica.account.auth.token(token)`.
 *
 * ::public end
 *
 * ::private
 *
 * Validation delegates to the current root Logica object API. Decode-only reads
 * parse the JWT payload locally because the refreshed SDK currently exposes
 * verification but not decode through `logica.account.auth`.
 *
 * ::private end
 * ::end
 */

import { logica } from '@/logica';

export type AccountAuthTokenPayload = {
  aid?: string;
  sid?: string;
  skey?: string;
  nid?: string;
  guest?: boolean | number;
  iat?: number;
  exp?: number;
  [claim: string]: unknown;
};

function b64urlToBase64(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  return pad ? base64 + '='.repeat(4 - pad) : base64;
}

function decodeBase64(input: string): string {
  if (typeof atob === 'function') {
    return atob(input);
  }

  return Buffer.from(input, 'base64').toString('utf8');
}

export function decodeAccountAuthToken(token: string | null | undefined): AccountAuthTokenPayload | null {
  const trimmed = token?.trim();
  if (!trimmed) return null;

  const parts = trimmed.split('.');
  if (parts.length !== 3) return null;

  try {
    return JSON.parse(decodeBase64(b64urlToBase64(parts[1]))) as AccountAuthTokenPayload;
  } catch {
    return null;
  }
}

export function validateAccountAuthToken(token: string | null | undefined) {
  return logica.account.auth.verify(token);
}

export function accountAuthToken(token: string | null | undefined) {
  return {
    decode() {
      return decodeAccountAuthToken(token);
    },

    validate() {
      return validateAccountAuthToken(token);
    },
  } as const;
}
