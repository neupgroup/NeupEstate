/**
 * bridge.ts
 *
 * URL builders and helpers for Neup.Account bridge API endpoints.
 *
 * IMPORTANT: This app only READS cookies. All cookie modifications
 * (setting, expiring, refreshing) are handled by Neup.Account bridge.
 */

const NEUPID_BASE = 'https://neupgroup.com/account';

type RequestLike = {
  url?: string;
  nextUrl?: { href?: string; origin?: string };
};

function getAppOrigin(request?: RequestLike): string {
  if (request?.nextUrl?.origin) {
    return request.nextUrl.origin;
  }

  if (request?.url) {
    return new URL(request.url).origin;
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://neupgroup.com/estate';
  return new URL(baseUrl).origin;
}

function getAppId(): string {
  return process.env.NEUPID_APP_ID ?? process.env.NEXT_PUBLIC_NEUPID_APP_ID ?? '';
}

/**
 * Build the callback URL for the handshake redirect.
 */
export function buildAuthCallbackUrl(request?: RequestLike): string {
  return new URL('/api/auth/callback', getAppOrigin(request)).toString();
}

/**
 * Build the URL for the handshake grant flow (user redirect to login).
 * GET /bridge/handshake.v1/auth/grant
 */
export function buildHandshakeGrantUrl(request?: RequestLike, redirectsTo?: string): string {
  const appId = getAppId();

  if (!appId) {
    const fallback = new URL(`${NEUPID_BASE}/auth/start`);
    if (redirectsTo) {
      fallback.searchParams.set('redirectsTo', redirectsTo);
    }
    return fallback.toString();
  }

  const url = new URL(`${NEUPID_BASE}/bridge/handshake.v1/auth/grant`);
  url.searchParams.set('app', appId);
  url.searchParams.set('authenticatesTo', buildAuthCallbackUrl(request));
  if (redirectsTo) {
    url.searchParams.set('redirectsTo', redirectsTo);
  }
  return url.toString();
}

/**
 * Build the URL for getting current user info.
 * GET /bridge/api.v1/auth/whoami
 */
export function buildWhoamiUrl(): string {
  return `${NEUPID_BASE}/bridge/api.v1/auth/whoami`;
}

/**
 * Build the URL for getting user access context (roles/permissions/teams).
 * GET /bridge/api.v1/auth/access
 */
export function buildAccessUrl(): string {
  return `${NEUPID_BASE}/bridge/api.v1/auth/access`;
}

/**
 * Fetch the current authenticated user's information using whoami endpoint.
 * This is useful for getting full user profile from the bridge API.
 */
export async function fetchWhoami(token: string) {
  const response = await fetch(buildWhoamiUrl(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    return { success: false, status: response.status };
  }

  const data = await response.json();
  return { success: true, data };
}

/**
 * Fetch the current user's access context (roles, permissions, teams, etc).
 */
export async function fetchAccessInfo(token: string) {
  const response = await fetch(buildAccessUrl(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    return { success: false, status: response.status };
  }

  const data = await response.json();
  return { success: true, data };
}
