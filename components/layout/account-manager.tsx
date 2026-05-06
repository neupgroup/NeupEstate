'use client';

import { useEffect } from 'react';
import { getOrCreateTemporaryAccountAction } from '@/app/actions';
import { getClientAccountId } from '@/lib/get-account-id';

const TEMP_COOKIE = 'temp_account_id';

function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/`;
}

export function AccountManager() {
  useEffect(() => {
    const checkAndSetAccount = async () => {
      // If auth_accounts has a valid aid, no temp account is needed
      const accountId = getClientAccountId();
      if (accountId) return;

      // No identity at all — create a temporary account for anonymous tracking
      const result = await getOrCreateTemporaryAccountAction();
      if (result.success && result.accountId) {
        setCookie(TEMP_COOKIE, result.accountId, 365);
      }
    };

    checkAndSetAccount();
  }, []);

  return null;
}
