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
  headers?: { get(name: string): string | null };
};

import { buildPublicAppUrl } from '@/logica/core/public-url';

function getAppId(): string {
  return process.env.NEUP_APP_ID ?? '';
}

function safeParseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Build the callback URL for the handshake redirect.
 */
export function buildAuthCallbackUrl(request?: RequestLike): string {
  return buildPublicAppUrl(request, '/bridge/api.v1/auth/callback');
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
  const url = buildWhoamiUrl();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
  } catch (error: any) {
    await logApiExchange({
      context: 'auth/bridge:fetchWhoami',
      request: { method: 'GET', url, headers },
      error: error?.message ?? 'network_error',
    });
    return { success: false, status: 0 };
  }

  const responseText = await response.text();
  await logApiExchange({
    context: 'auth/bridge:fetchWhoami',
    request: { method: 'GET', url, headers },
    response: { status: response.status, body: responseText },
  });

  if (!response.ok) {
    return { success: false, status: response.status };
  }

  const data = safeParseJson(responseText);
  return { success: true, data };
}

/**
 * Fetch the current user's access context (roles, permissions, teams, etc).
 */
export async function fetchAccessInfo(token: string) {
  const url = buildAccessUrl();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
  } catch (error: any) {
    await logApiExchange({
      context: 'auth/bridge:fetchAccessInfo',
      request: { method: 'GET', url, headers },
      error: error?.message ?? 'network_error',
    });
    return { success: false, status: 0 };
  }

  const responseText = await response.text();
  await logApiExchange({
    context: 'auth/bridge:fetchAccessInfo',
    request: { method: 'GET', url, headers },
    response: { status: response.status, body: responseText },
  });

  if (!response.ok) {
    return { success: false, status: response.status };
  }

  const data = safeParseJson(responseText);
  return { success: true, data };
}
import { logApiExchange } from '@/services/api-log-service';
