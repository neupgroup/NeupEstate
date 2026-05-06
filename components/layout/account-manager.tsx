'use client';

import { useEffect } from 'react';
import { resolveAccountAction } from '@/app/actions';
import { getActiveAccount } from '@/services/account/getAccount';

const TEMP_COOKIE = 'temp_account_id';
const AUTH_COOKIE = 'auth_accounts';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  for (let c of document.cookie.split(';')) {
    c = c.trim();
    if (c.startsWith(nameEQ)) return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}

function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/`;
}

export function AccountManager() {
  useEffect(() => {
    const run = async () => {
      // --- Authenticated user ---
      // Read aid from auth_accounts (def === 1). Upsert it in the DB so the
      // account row exists, then we're done — no temp cookie needed.
      const authRaw = readCookie(AUTH_COOKIE);
      const active = getActiveAccount(authRaw);

      if (active?.aid) {
        await resolveAccountAction(active.aid);
        return;
      }

      // --- Guest user ---
      // If we already issued a track.* cookie this session, nothing to do.
      const existing = readCookie(TEMP_COOKIE);
      if (existing) return;

      // First visit — create a track.* account in the DB and store the ID.
      const result = await resolveAccountAction(null);
      if (result.success && result.accountId) {
        setCookie(TEMP_COOKIE, result.accountId, 365);
      }
    };

    run();
  }, []);

  return null;
}
