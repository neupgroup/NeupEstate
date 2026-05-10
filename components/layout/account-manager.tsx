'use client';

/**
 * AccountManager
 *
 * Runs once on mount. Checks the auth_account JWT cookie (set by NeupID on
 * the shared domain). If the user is already identified (registered or guest),
 * upserts the account row. If not, runs Silent SSO.
 *
 * Flow:
 *   1. Check auth_account cookie — if aid is present, upsert and done.
 *   2. No cookie → run Silent SSO via the NeupID iframe bridge.
 *      → authenticated: POST /api/auth/callback to upsert the DB row.
 *        NeupID already set the auth_account cookie on the shared domain.
 *      → no_session / timeout / failure: silently ignore — the whoisthisthat
 *        bridge (triggered by proxy.ts) will handle identification on next nav.
 */

import { useEffect } from 'react';
import { resolveAccountAction } from '@/app/actions';
import { getActiveAccount } from '@/services/account/getAccount';
import { initSilentSSO, generatePKCE } from '@/lib/neupid-silent-sso';

const AUTH_COOKIE = 'auth_account';
const APP_ID = process.env.NEXT_PUBLIC_NEUPID_APP_ID ?? '';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  for (let c of document.cookie.split(';')) {
    c = c.trim();
    if (c.startsWith(nameEQ)) return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}

export function AccountManager() {
  useEffect(() => {
    const run = async () => {
      // Step 1: Check if already identified via the auth_account JWT cookie
      const raw = readCookie(AUTH_COOKIE);
      const account = getActiveAccount(raw);

      if (account?.aid) {
        // Already identified (registered or guest) — upsert account row
        await resolveAccountAction(account.guest === 1 ? null : account.aid);
        return;
      }

      // Step 2: No cookie — try Silent SSO to get a session
      if (!APP_ID) return;

      const { verifier, challenge } = await generatePKCE();
      sessionStorage.setItem('neupid_pkce_verifier', verifier);

      initSilentSSO({
        appId: APP_ID,
        codeChallenge: challenge,
        onResult: async (result) => {
          if (result.authenticated) {
            const codeVerifier = sessionStorage.getItem('neupid_pkce_verifier') ?? undefined;
            sessionStorage.removeItem('neupid_pkce_verifier');

            try {
              const res = await fetch('/api/auth/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: result.code, codeVerifier }),
              });

              if (res.ok) {
                // NeupID has set the auth_account cookie — reload to pick it up
                window.location.reload();
              }
              // If exchange failed, proxy.ts will redirect to whoisthisthat on next nav
            } catch {
              // Silently ignore — proxy.ts handles identification
            }
          }
          // no_session / timeout: proxy.ts whoisthisthat redirect handles it
        },
      });
    };

    run();
  }, []);

  return null;
}
