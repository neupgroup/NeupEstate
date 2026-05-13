/**
 * jwt.ts
 *
 * JWT verification and decoding service for auth_account tokens.
 * Uses the RSA public key from AUTH_PUBLIC_KEY environment variable.
 */

import { logJWTVerificationError, logJWTDecodingError } from './logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthAccountPayload = {
  /** Account ID — always present */
  aid: string;
  /** Session ID */
  sid?: string;
  /** Session key */
  skey?: string;
  /** NeupID handle, e.g. "neupcloud" (registered accounts only) */
  nid?: string;
  /** 1 for guest accounts, absent for registered */
  guest?: number;
  /** JWT issued-at (Unix seconds) */
  iat?: number;
  /** JWT expiry (Unix seconds) */
  exp?: number;
};

export type JWTVerifyResult =
  | { valid: true; payload: AuthAccountPayload }
  | { valid: false; reason: string; payload?: Partial<AuthAccountPayload> };

// ─── Internal helpers ────────────────────────────────────────────────────────

/** Base64url → Uint8Array */
function b64urlToBytes(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Base64url decode to string */
function b64urlDecode(str: string): string {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  return atob(pad ? s + '='.repeat(4 - pad) : s);
}

/**
 * Decode a JWT payload without verifying the signature.
 * Returns null if the token is malformed.
 */
export function decodeJwtPayload(token: string): AuthAccountPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      logJWTDecodingError(token, new Error('JWT does not have 3 parts')).catch(() => {});
      return null;
    }
    const json = b64urlDecode(parts[1]);
    return JSON.parse(json) as AuthAccountPayload;
  } catch (error) {
    logJWTDecodingError(token, error as Error).catch(() => {});
    return null;
  }
}

/**
 * Import the RSA public key from the PEM string stored in AUTH_PUBLIC_KEY.
 * Supports "-----BEGIN PUBLIC KEY-----" (SPKI) format.
 */
async function importPublicKey(): Promise<CryptoKey> {
  const pem = process.env.AUTH_PUBLIC_KEY;
  if (!pem) {
    const error = new Error('AUTH_PUBLIC_KEY env var is not set');
    await logJWTVerificationError('missing_public_key', null, error);
    throw error;
  }

  try {
    // Strip PEM header/footer and newlines, then decode base64 → DER bytes
    const pemBody = pem
      .replace(/-----BEGIN PUBLIC KEY-----/g, '')
      .replace(/-----END PUBLIC KEY-----/g, '')
      .replace(/\\n/g, '')   // escaped newlines from .env
      .replace(/\n/g, '')    // real newlines
      .replace(/\r/g, '')
      .trim();

    const derBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

    return await crypto.subtle.importKey(
      'spki',
      derBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
  } catch (error) {
    await logJWTVerificationError('public_key_import_failed', null, error as Error);
    throw error;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Verifies the JWT signature of the auth_account cookie value using the
 * RSA public key from AUTH_PUBLIC_KEY (RS256).
 *
 * Also checks that the token is not expired and contains required fields.
 *
 * @param token - Raw JWT token string
 * @returns Verification result with payload if valid, or error reason if invalid
 */
export async function verifyAuthJWT(token: string | null | undefined): Promise<JWTVerifyResult> {
  if (!token) {
    await logJWTVerificationError('missing_token', token);
    return { valid: false, reason: 'missing_token' };
  }

  const trimmed = token.trim();
  const parts = trimmed.split('.');
  
  if (parts.length !== 3) {
    await logJWTVerificationError('malformed_token', trimmed);
    return { valid: false, reason: 'malformed_token' };
  }

  // 1. Decode payload first (no verification yet) so we can check expiry
  const payload = decodeJwtPayload(trimmed);
  if (!payload) {
    await logJWTVerificationError('invalid_payload', trimmed);
    return { valid: false, reason: 'invalid_payload' };
  }

  if (!payload.aid) {
    await logJWTVerificationError('missing_aid', trimmed);
    return { valid: false, reason: 'missing_aid', payload };
  }

  // 2. Check expiry
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    await logJWTVerificationError('token_expired', trimmed);
    return { valid: false, reason: 'token_expired', payload };
  }

  // 3. Verify signature
  try {
    const publicKey = await importPublicKey();

    const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = b64urlToBytes(parts[2]);

    const isValid = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      publicKey,
      signature,
      signingInput,
    );

    if (!isValid) {
      await logJWTVerificationError('invalid_signature', trimmed);
      return { valid: false, reason: 'invalid_signature', payload };
    }

    return { valid: true, payload };
  } catch (err: any) {
    await logJWTVerificationError(
      err?.message ?? 'verification_error',
      trimmed,
      err
    );
    return { 
      valid: false, 
      reason: err?.message ?? 'verification_error',
      payload 
    };
  }
}

/**
 * Decodes a JWT without verifying the signature.
 * Use this only for non-security-critical operations.
 * For authentication/authorization, always use verifyAuthJWT.
 *
 * @param token - Raw JWT token string
 * @returns Decoded payload or null if malformed
 */
export function decodeAuthJWT(token: string | null | undefined): AuthAccountPayload | null {
  if (!token) return null;
  return decodeJwtPayload(token.trim());
}
