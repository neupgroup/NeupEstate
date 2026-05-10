'use client';

/**
 * AccountManager
 *
 * Runs once on mount. Decides whether the user is already authenticated
 * (auth_accounts cookie has an entry with def === true) or needs to go
 * through Silent SSO.
 *
 * Flow:
 *   1. Check auth_accounts cookie for def === true entry
 *      → If found: user is authenticated, just upsert the account row
 *      → If not found: run Silent SSO
 *
 *   2. Silent SSO result:
 *      → authenticated: POST /api/auth/callback with the code
 *                        → server exchanges code, sets auth_accounts cookie
 *      → no_session / timeout: create/reuse a guest track.* account
 *      → other failures: silently ignore (don't block the page)
 */

import { useEffect } from 'react';
import { resolveAccountAction } from '@/app/actions';
import { getActiveAccount } from '@/services/account/getAccount';
import { initSilentSSO, generatePKCE } from '@/lib/neupid-silent-sso';

const TEMP_COOKIE = 'temp_account_id';
const AUTH_COOKIE = 'auth_accounts';
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

function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${date.toUTCString()}; path=/`;
}

async function handleGuestFallback() {
  const existing = readCookie(TEMP_COOKIE);
  if (existing) return; // already have a guest ID
  const result = await resolveAccountAction(null);
  if (result.success && result.accountId) {
    setCookie(TEMP_COOKIE, result.accountId, 365);
  }
}

export function AccountManager() {
  useEffect(() => {
    const run = async () => {
      // Step 1: Check if already authenticated via the new cookie format
      const authRaw = readCookie(AUTH_COOKIE);
      const active = getActiveAccount(authRaw);

      if (active?.aid) {
        // Already authenticated — upsert account row and done
        await resolveAccountAction(active.aid);
        return;
      }

      // Step 2: No authenticated session — try Silent SSO
      if (!APP_ID) {
        // No app ID configured — fall back to guest
        await handleGuestFallback();
        return;
      }

      // Generate PKCE for secure exchange
      const { verifier, challenge } = await generatePKCE();
      sessionStorage.setItem('neupid_pkce_verifier', verifier);

      initSilentSSO({
        appId: APP_ID,
        codeChallenge: challenge,
        onResult: async (result) => {
          if (result.authenticated) {
            // Exchange the code server-side
            const codeVerifier = sessionStorage.getItem('neupid_pkce_verifier') ?? undefined;
            sessionStorage.removeItem('neupid_pkce_verifier');

            try {
              const res = await fetch('/api/auth/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: result.code, codeVerifier }),
              });

              if (res.ok) {
                // Cookie is now set by the server — reload to pick it up
                window.location.reload();
              } else {
                // Exchange failed — fall back to guest
                await handleGuestFallback();
              }
            } catch {
              await handleGuestFallback();
            }
          } else {
            // no_session, timeout, origin_not_registered, rate_limited
            // Don't redirect — just fall back to guest for anonymous browsing
            await handleGuestFallback();
          }
        },
      });
    };

    run();
  }, []);

  return null;
}
