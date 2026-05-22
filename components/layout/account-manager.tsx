'use client';

/**
 * AccountManager
 *
 * Runs once on mount. Fetches the current authenticated identity from the
 * server-side cookie session and upserts the account row when present.
 * If the session is missing, the auth guard will redirect through the
 * documented handshake flow.
 */

import { useEffect } from 'react';
import { resolveAccountAction } from '@/app/actions';

export function AccountManager() {
  useEffect(() => {
    const run = async () => {
      const res = await fetch('/bridge/api.v1/auth/me', { credentials: 'include' });

      if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        if (body?.redirectTo && typeof window !== 'undefined') {
          window.location.href = body.redirectTo;
        }
        return;
      }

      if (!res.ok) {
        return;
      }

      const data = await res.json().catch(() => null);
      if (data?.accountId) {
        await resolveAccountAction(data.guest ? null : data.accountId);
      }
    };

    run();
  }, []);

  return null;
}
