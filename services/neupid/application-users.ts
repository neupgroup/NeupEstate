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
    return {
      success: false,
      users: [],
      status: 500,
      error: 'Missing NEUP_APP_ID / NEUP_APP_SECRET environment variables',
    };
  }

  const base = process.env.NEUP_AUTH_URL ?? 'https://neupgroup.com/account';
  const offset = Math.max(0, input?.offset ?? 0);
  const limit = Math.max(1, Math.min(500, input?.limit ?? 100));
  const url = new URL('/bridge/api.v1/application/users', base);
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('limit', String(limit));

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        'app-id': appId,
        app_secret: appSecret,
      }),
      cache: 'no-store',
    });
  } catch (error: any) {
    return {
      success: false,
      users: [],
      status: 502,
      error: error?.message ?? 'Network error while fetching Neup application users',
    };
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // Keep body null, status will capture failure state below.
  }

  if (!response.ok) {
    const upstreamMessage =
      body && typeof body === 'object' && typeof (body as Record<string, unknown>).message === 'string'
        ? ((body as Record<string, unknown>).message as string)
        : null;
    return {
      success: false,
      users: [],
      status: response.status,
      error: upstreamMessage ?? `Neup users API failed with status ${response.status}`,
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
