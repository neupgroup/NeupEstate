'use client';

import { useEffect } from 'react';
import { getOrCreateTemporaryAccountAction } from '@/app/actions';
import { getActiveAccount } from '@/services/account/getAccount';

const TEMP_COOKIE = 'temp_account_id';
const AUTH_COOKIE = 'auth_accounts';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let c of ca) {
    c = c.trim();
    if (c.startsWith(nameEQ)) return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}

function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/`;
}

export function AccountManager() {
  useEffect(() => {
    const checkAndSetAccount = async () => {
      // Prefer aid from auth_accounts (authenticated user)
      const authAccountsRaw = getCookie(AUTH_COOKIE);
      const active = getActiveAccount(authAccountsRaw);
      if (active) return; // aid is available — no temp account needed

      // Fall back to temp_account_id for anonymous users
      const tempAccountId = getCookie(TEMP_COOKIE);
      if (!tempAccountId) {
        const result = await getOrCreateTemporaryAccountAction();
        if (result.success && result.accountId) {
          setCookie(TEMP_COOKIE, result.accountId, 365);
        }
      }
    };

    checkAndSetAccount();
  }, []);

  return null;
}
