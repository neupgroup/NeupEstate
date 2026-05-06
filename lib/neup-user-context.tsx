'use client';

/**
 * neup-user-context.tsx
 *
 * Fetches the authenticated user's identity from the NeupID whoami endpoint
 * once per session, caches it in sessionStorage, and exposes it to the entire
 * React tree via context.
 *
 * The whoami endpoint reads the NeupID session cookie directly from the
 * browser — no session triplet needed on our side.
 *
 * Usage:
 *   import { useNeupUser } from '@/lib/neup-user-context';
 *   const user = useNeupUser(); // NeupUser | null
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getActiveAccount } from '@/services/account/getAccount';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NeupUser = {
  accountId: string;
  neupId: string;
  displayName: string;
  displayImage: string;
  accountType: string;
  verified: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SESSION_KEY = 'neup_user';
const AUTH_COOKIE = 'auth_accounts';
const WHOAMI_URL =
  (process.env.NEXT_PUBLIC_NEUPID_WHOAMI_URL as string | undefined) ??
  'https://neupgroup.com/account/bridge/api.v1/auth/whoami';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  for (let c of document.cookie.split(';')) {
    c = c.trim();
    if (c.startsWith(nameEQ)) return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}

function hasAuthCookie(): boolean {
  const raw = readCookie(AUTH_COOKIE);
  const active = getActiveAccount(raw);
  return !!active?.aid;
}

function readFromSession(): NeupUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NeupUser;
  } catch {
    return null;
  }
}

function writeToSession(user: NeupUser) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // sessionStorage unavailable (private browsing edge cases)
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NeupUserContext = createContext<NeupUser | null>(null);

export function NeupUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<NeupUser | null>(null);

  useEffect(() => {
    // Only attempt whoami if the auth_accounts cookie is present
    if (!hasAuthCookie()) {
      clearSession();
      return;
    }

    // Return cached value immediately to avoid a flash
    const cached = readFromSession();
    if (cached) {
      setUser(cached);
      return;
    }

    // Fetch from whoami endpoint — the browser sends the NeupID session cookie
    // automatically because credentials: 'include' is set.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(WHOAMI_URL, {
          method: 'GET',
          credentials: 'include',
        });
        if (!res.ok) {
          clearSession();
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (data?.success) {
          const neupUser: NeupUser = {
            accountId: data.accountId,
            neupId: data.neupId,
            displayName: data.displayName,
            displayImage: data.displayImage,
            accountType: data.accountType,
            verified: data.verified,
          };
          writeToSession(neupUser);
          setUser(neupUser);
        } else {
          clearSession();
        }
      } catch {
        // Network error or CORS — silently fail; user stays null
        clearSession();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <NeupUserContext.Provider value={user}>
      {children}
    </NeupUserContext.Provider>
  );
}

/**
 * Returns the authenticated NeupUser from sessionStorage/whoami, or null if
 * the user is not logged in or the fetch hasn't completed yet.
 */
export function useNeupUser(): NeupUser | null {
  return useContext(NeupUserContext);
}

/**
 * Returns initials from a display name for use in AvatarFallback.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}
