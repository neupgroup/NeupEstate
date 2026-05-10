/**
 * check-auth-web.ts
 *
 * Server-side auth utilities for Next.js Server Components and page routes.
 *
 * checkAuthenticationForWeb()
 *   Verifies the user is a registered (non-guest) account.
 *   If not, redirects to neupgroup.com/account/auth/start with the current
 *   path as the post-login redirect target. Returns void.
 *
 * getAccountIdFromJWT()
 *   Reads the accountId (aid) from the auth_account JWT cookie.
 *   Returns null if no valid session exists.
 *   Call checkAuthenticationForWeb() first if you need the auth guard.
 *
 * Usage:
 *   await checkAuthenticationForWeb();
 *   const accountId = await getAccountIdFromJWT();
 */

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getIdentity } from './get-identity';

const AUTH_START_URL = 'https://neupgroup.com/account/auth/start';
const BASE_PATH = '/estate';

export async function checkAuthenticationForWeb(): Promise<void> {
  const identity = await getIdentity();

  // Guests and unauthenticated users are both redirected
  if (!identity.authenticated || identity.guest) {
    const headerStore = await headers();
    const pathname = headerStore.get('x-next-pathname') ?? '';

    const dest = new URL(AUTH_START_URL);
    if (pathname && pathname !== '/') {
      dest.searchParams.set('redirects', BASE_PATH + pathname);
    }

    redirect(dest.toString());
  }
}

export async function getAccountIdFromJWT(): Promise<string | null> {
  const identity = await getIdentity();
  return identity.authenticated ? identity.account.accountId : null;
}
