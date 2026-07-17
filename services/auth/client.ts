/**
 * client.ts
 *
 * Browser-only helpers for reading unverified auth_account cookie data.
 *
 * ::neup.documentation::auth-client-cookie-helpers
 * ::title Auth Client Cookie Helpers
 *
 * ::public
 *
 * Provides browser-only helpers for reading and decoding the `auth_account` cookie without importing server auth modules.
 *
 * ::public end
 *
 * ::private
 *
 * These helpers do not verify JWT signatures and must not be used for authorization or other security decisions.
 *
 * ::private end
 *
 * ::end
 */

import type { AuthAccountPayload } from './jwt';

const COOKIE_NAME = 'auth_account';

function readCookieClient(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const namePrefix = `${name}=`;
  for (const cookie of document.cookie.split(';')) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(namePrefix)) {
      return decodeURIComponent(trimmed.substring(namePrefix.length));
    }
  }

  return null;
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.length % 4 ? base64 + '='.repeat(4 - (base64.length % 4)) : base64;
  return atob(padded);
}

export function getClientAccount(): AuthAccountPayload | null {
  const token = readCookieClient(COOKIE_NAME);
  if (!token) return null;

  try {
    const parts = token.trim().split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(decodeBase64Url(parts[1])) as AuthAccountPayload;
  } catch {
    return null;
  }
}

export function getClientAccountId(): string | null {
  return getClientAccount()?.aid ?? null;
}

export function isClientAuthenticated(): boolean {
  const account = getClientAccount();
  return !!account?.aid && !!account.nid && account.guest !== 1;
}

export function isClientIdentified(): boolean {
  return !!getClientAccount()?.aid;
}
