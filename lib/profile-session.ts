'use client';

export type ProfileSessionData = {
  displayName?: string | null;
  displayImage?: string | null;
  neupid?: string | null;
  accountId?: string | null;
  accountType?: string | null;
  verified?: boolean;
};

const PROFILE_SESSION_KEY = 'profile';

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function getSessionStorageData(variable: string = PROFILE_SESSION_KEY): ProfileSessionData | null {
  if (!hasWindow()) {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(variable);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as ProfileSessionData;
  } catch {
    return null;
  }
}

export function setSessionStorageData(variable: string = PROFILE_SESSION_KEY, value: ProfileSessionData): void {
  if (!hasWindow()) {
    return;
  }

  try {
    sessionStorage.setItem(variable, JSON.stringify(value));
  } catch {
    // Ignore quota / storage errors.
  }
}

export function clearSessionStorageData(variable: string = PROFILE_SESSION_KEY): void {
  if (!hasWindow()) {
    return;
  }

  try {
    sessionStorage.removeItem(variable);
  } catch {
    // Ignore storage errors.
  }
}

export function getName(variable: string = PROFILE_SESSION_KEY): string {
  return getSessionStorageData(variable)?.displayName ?? 'User';
}

export function getDisplayImage(variable: string = PROFILE_SESSION_KEY): string | null {
  return getSessionStorageData(variable)?.displayImage ?? null;
}

export function getNeupid(variable: string = PROFILE_SESSION_KEY): string | null {
  return getSessionStorageData(variable)?.neupid ?? null;
}

export async function loadProfileSessionData(variable: string = PROFILE_SESSION_KEY): Promise<ProfileSessionData | null> {
  if (!hasWindow()) {
    return null;
  }

  const cached = getSessionStorageData(variable);
  if (cached?.displayName || cached?.displayImage || cached?.neupid) {
    return cached;
  }

  try {
    const response = await fetch('/api/auth/user', {
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearSessionStorageData(variable);
      }
      return null;
    }

    const payload = await response.json().catch(() => null);
    const user = payload?.user;

    const profile: ProfileSessionData = {
      displayName: user?.profile?.displayName ?? user?.displayName ?? null,
      displayImage: user?.profile?.displayImage ?? user?.displayImage ?? null,
      neupid: user?.profile?.neupid ?? user?.nid ?? null,
      accountId: user?.aid ?? null,
      accountType: user?.accountType ?? null,
      verified: user?.verified ?? user?.guest !== true,
    };

    if (profile.displayName || profile.displayImage || profile.neupid) {
      setSessionStorageData(variable, profile);
      return profile;
    }

    return null;
  } catch {
    return null;
  }
}
