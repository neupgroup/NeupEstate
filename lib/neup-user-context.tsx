'use client';

/**
 * neup-user-context.tsx
 *
 * Provides the authenticated user's identity to the React tree.
 *
 * Receives initial user identity from server-rendered layout and caches it
 * in sessionStorage for fast client-side navigation.
 *
 * For richer profile data (displayName, avatar, etc.) the app can use the
 * data returned from server-provided user context.
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

export function NeupUserProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: NeupUser | null;
}) {
  const [user, setUser] = useState<NeupUser | null>(initialUser);

  useEffect(() => {
    console.log('[NeupUserProvider] effect start');
    if (initialUser) {
      console.log('[NeupUserProvider] using initial user from server:', initialUser);
      writeToSession(initialUser);
      setUser(initialUser);
      return;
    }

    const cached = readFromSession();
    if (cached) {
      console.log('[NeupUserProvider] using cached user:', cached);
      queueMicrotask(() => setUser(cached));
      return;
    }

    clearSession();
    setUser(null);
  }, [initialUser]);

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
