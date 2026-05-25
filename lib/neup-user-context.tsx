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
    console.log('[NeupUserProvider] readFromSession raw:', raw);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NeupUser;
    console.log('[NeupUserProvider] readFromSession parsed:', parsed);
    return parsed;
  } catch {
    console.log('[NeupUserProvider] readFromSession parse failed');
    return null;
  }
}

function writeToSession(user: NeupUser) {
  try {
    console.log('[NeupUserProvider] writeToSession user:', user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch (error) {
    console.log('[NeupUserProvider] writeToSession failed:', error);
  }
}

function clearSession() {
  try {
    console.log('[NeupUserProvider] clearSession');
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.log('[NeupUserProvider] clearSession failed:', error);
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const NeupUserContext = createContext<NeupUser | null>(null);

export function NeupUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<NeupUser | null>(null);

  useEffect(() => {
    console.log('[NeupUserProvider] effect start');
    // Return cached value immediately to avoid a flash
    const cached = readFromSession();
    if (cached) {
      console.log('[NeupUserProvider] using cached user:', cached);
      queueMicrotask(() => setUser(cached));
      return;
    }

    // The auth_account cookie is httpOnly — we can't read it from JS.
    // Instead, call our own bridge auth endpoint which reads it server-side.
    let cancelled = false;
    (async () => {
      try {
        console.log('[NeupUserProvider] fetching /api/auth/me');
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        console.log('[NeupUserProvider] /api/auth/me status:', res.status);

        // JWT invalid or missing — redirect to NeupID login
        if (res.status === 401) {
          const body = await res.json().catch(() => ({}));
          console.log('[NeupUserProvider] auth 401 response body:', body);
          clearSession();
          if (body?.redirectTo && typeof window !== 'undefined') {
            console.log('[NeupUserProvider] redirecting to:', body.redirectTo);
            window.location.href = body.redirectTo;
          }
          return;
        }

        if (!res.ok) {
          console.log('[NeupUserProvider] non-ok response, clearing session');
          clearSession();
          return;
        }

        const data = await res.json();
        console.log('[NeupUserProvider] auth/me payload:', data);
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
          console.log('[NeupUserProvider] mapped neupUser:', neupUser);
          writeToSession(neupUser);
          setUser(neupUser);
        } else {
          console.log('[NeupUserProvider] missing accountId in payload');
          clearSession();
        }
      } catch (error) {
        console.log('[NeupUserProvider] fetch failed:', error);
        clearSession();
      }
    })();

    return () => {
      cancelled = true;
      console.log('[NeupUserProvider] effect cleanup (cancelled=true)');
    };
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
