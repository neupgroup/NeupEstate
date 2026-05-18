'use client';

/**
 * neup-user-context.tsx
 *
 * Provides the authenticated user's identity to the React tree.
 *
 * The auth_account cookie is httpOnly, so the provider fetches /api/auth/me
 * and caches the server-confirmed identity in sessionStorage.
 *
 * For richer profile data (displayName, avatar, etc.) the app can use the
 * data returned from /api/auth/me.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NeupUser = {
  accountId: string;
  neupId?: string;
  displayName?: string;
  displayImage?: string;
  accountType?: string;
  verified?: boolean;
};

// ---------------------------------------------------------------------------
// Session storage cache key
// ---------------------------------------------------------------------------

const SESSION_KEY = 'neup_user';

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
  } catch {}
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
    // Return cached value immediately to avoid a flash
    const cached = readFromSession();
    if (cached) {
      queueMicrotask(() => setUser(cached));
      return;
    }

    // The auth_account cookie is httpOnly — we can't read it from JS.
    // Instead, call our own /api/auth/me endpoint which reads it server-side.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });

        // JWT invalid or missing — redirect to NeupID login
        if (res.status === 401) {
          const body = await res.json().catch(() => ({}));
          clearSession();
          if (body?.redirectTo && typeof window !== 'undefined') {
            window.location.href = body.redirectTo;
          }
          return;
        }

        if (!res.ok) {
          clearSession();
          return;
        }

        const data = await res.json();
        if (cancelled) return;
        if (data?.accountId) {
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
        clearSession();
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <NeupUserContext.Provider value={user}>
      {children}
    </NeupUserContext.Provider>
  );
}

export function useNeupUser(): NeupUser | null {
  return useContext(NeupUserContext);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}
