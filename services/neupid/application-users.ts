import { logApiExchange } from '@/services/api-log-service';
import { logProblem } from '@/services/problem-service';

type ApplicationUser = {
  accountId: string;
  neupId: string | null;
  displayName: string | null;
  displayImage: string | null;
  accountType: string | null;
};

type FetchApplicationUsersResult =
  | {
      success: true;
      users: ApplicationUser[];
      status: number;
      total: number;
    }
  | {
      success: false;
      users: [];
      status: number;
      error: string;
    };

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function normalizeUser(input: unknown): ApplicationUser | null {
  if (!input || typeof input !== 'object') return null;
  const obj = input as Record<string, unknown>;

  const accountId = pickString(obj, ['accountId', 'account_id', 'aid', 'id']);
  if (!accountId) return null;

  return {
    accountId,
    neupId: pickString(obj, ['neupId', 'neup_id', 'nid', 'handle']),
    displayName: pickString(obj, ['displayName', 'display_name', 'name']),
    displayImage: pickString(obj, ['displayImage', 'display_image', 'avatar', 'image']),
    accountType: pickString(obj, ['accountType', 'account_type', 'type']),
  };
}

function readUsersFromResponse(body: unknown): unknown[] {
  if (!body || typeof body !== 'object') return [];
  const root = body as Record<string, unknown>;

  if (Array.isArray(root.users)) return root.users;
  if (Array.isArray(root.data)) return root.data;

  if (root.data && typeof root.data === 'object') {
    const data = root.data as Record<string, unknown>;
    if (Array.isArray(data.users)) return data.users;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.accounts)) return data.accounts;
  }

  if (Array.isArray(root.items)) return root.items;
  if (Array.isArray(root.accounts)) return root.accounts;
  return [];
}

function getAppId(): string {
  return process.env.NEUP_APP_ID ?? '';
}

function getAppSecret(): string {
  return process.env.NEUP_APP_SECRET ?? '';
}

export async function fetchApplicationUsers(input?: {
  offset?: number;
  limit?: number;
}): Promise<FetchApplicationUsersResult> {
  const appId = getAppId();
  const appSecret = getAppSecret();

  if (!appId || !appSecret) {
    const error = 'Missing NEUP_APP_ID / NEUP_APP_SECRET environment variables';
    await logProblem(
      new Error(error),
      'neupid/application-users:fetchApplicationUsers',
      {
        request: null,
        response: null,
      },
    );
    return {
      success: false,
      users: [],
      status: 500,
      error,
    };
  }

  const base = process.env.NEUP_AUTH_URL ?? 'https://neupgroup.com/account';
  const offset = Math.max(0, input?.offset ?? 0);
  const limit = Math.max(1, Math.min(500, input?.limit ?? 100));
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const url = new URL('bridge/api.v1/application/users', normalizedBase);
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('limit', String(limit));

  const requestHeaders = { 'Content-Type': 'application/json' };
  const requestBody = {
    'app-id': appId,
    app_secret: appSecret,
  };

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    });
  } catch (error: any) {
    const message = error?.message ?? 'Network error while fetching Neup application users';
    await logApiExchange({
      context: 'neupid/application-users:fetchApplicationUsers',
      request: {
        method: 'POST',
        url: url.toString(),
        headers: requestHeaders,
        body: requestBody,
      },
      error: message,
    });
    await logProblem(
      new Error(message),
      'neupid/application-users:fetchApplicationUsers',
      {
        request: {
          method: 'POST',
          url: url.toString(),
          headers: requestHeaders,
          body: requestBody,
        },
        response: null,
      },
    );
    return {
      success: false,
      users: [],
      status: 502,
      error: message,
    };
  }

  let body: unknown = null;
  let responseText = '';
  try {
    responseText = await response.text();
    body = responseText ? JSON.parse(responseText) : null;
  } catch {
    // Keep body null, status will capture failure state below.
  }

  const responsePayload = {
    status: response.status,
    body: responseText || body,
  };

  await logApiExchange({
    context: 'neupid/application-users:fetchApplicationUsers',
    request: {
      method: 'POST',
      url: url.toString(),
      headers: requestHeaders,
      body: requestBody,
    },
    response: responsePayload,
  });

  if (!response.ok) {
    const upstreamMessage =
      body && typeof body === 'object' && typeof (body as Record<string, unknown>).message === 'string'
        ? ((body as Record<string, unknown>).message as string)
        : null;
    const message = upstreamMessage ?? `Neup users API failed with status ${response.status}`;

    await logProblem(
      new Error(message),
      'neupid/application-users:fetchApplicationUsers',
      {
        request: {
          method: 'POST',
          url: url.toString(),
          headers: requestHeaders,
          body: requestBody,
        },
        response: responsePayload,
      },
    );

    return {
      success: false,
      users: [],
      status: response.status,
      error: message,
    };
  }

  const users = readUsersFromResponse(body)
    .map(normalizeUser)
    .filter((value): value is ApplicationUser => value !== null);

  return {
    success: true,
    users,
    status: response.status,
    total: users.length,
  };
}

export type { ApplicationUser, FetchApplicationUsersResult };
