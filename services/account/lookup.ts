import { headers } from 'next/headers';
import { getAuthCookieServer } from '@/services/auth/cookie';
import { logApiExchange } from '@/services/api-log-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AccountInfo = {
  accountId: string;
  displayName: string;
  displayImage: string;
  accountType: string;
  neupId: string;
};

export type AccountLookupMeta = {
  request: {
    method: 'POST';
    url: string;
    headers: Record<string, string>;
    body: Record<string, string>;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body: unknown;
  };
};

export type AccountLookupResult =
  | { found: true; account: AccountInfo; meta: AccountLookupMeta }
  | { found: false; error: string; meta: AccountLookupMeta };

export type SignedAccountInfo = {
  accountId: string;
  connectionId: string | null;
  displayName: string | null;
  displayImage: string | null;
  neupId: string | null;
  role: string | null;
  token: string | null;
  isMinor: boolean | null;
};

export type SignedAccountLookupMeta = {
  request: {
    method: 'POST';
    url: string;
    headers: Record<string, string>;
    body: Record<string, string>;
  };
  response?: {
    status: number;
    headers: Record<string, string>;
    body: unknown;
  };
};

export type SignedAccountLookupResult =
  | { found: true; account: SignedAccountInfo; meta: SignedAccountLookupMeta }
  | { found: false; error: string; meta: SignedAccountLookupMeta };

export type AccountLookupInput =
  | { accountId: string; neupId?: never }
  | { neupId: string; accountId?: never };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOOKUP_BASE = 'https://neupgroup.com/account/bridge/api.v1/accounts/lookup';
const SIGN_AND_GET_BASE = 'https://neupgroup.com/account/bridge/api.v1/connection/sign&get';

function getAppId(): string {
  return process.env.NEUP_APP_ID ?? '';
}

function getAppSecret(): string {
  return process.env.NEUP_APP_SECRET ?? '';
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function safeJsonParse(value: string): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getRoleName(role: unknown): string | null {
  if (!role) return null;
  if (typeof role === 'string') return role;
  if (typeof role === 'object' && role !== null && 'name' in role) {
    const roleName = (role as { name?: unknown }).name;
    return typeof roleName === 'string' ? roleName : null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Service function
// ---------------------------------------------------------------------------

export async function getAccountInformation(
  input: AccountLookupInput,
): Promise<AccountLookupResult> {
  const url = LOOKUP_BASE;
  const appId = getAppId();
  const appSecret = getAppSecret();

  if (!appId || !appSecret) {
    return {
      found: false,
      error: 'missing_app_credentials',
      meta: {
        request: {
          method: 'POST',
          url,
          headers: { 'Content-Type': 'application/json' },
          body: {},
        },
      },
    };
  }

  const requestBody: Record<string, string> = input.accountId
    ? { accountId: input.accountId, appId, appSecret }
    : { neupId: input.neupId!, appId, appSecret };

  const incomingHeaders = await headers();
  const inboundOrigin = incomingHeaders.get('origin') ?? '';
  const inboundCookie = incomingHeaders.get('cookie') ?? '';

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: inboundOrigin,
    Cookie: inboundCookie,
  };

  const loggedHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(inboundOrigin ? { Origin: inboundOrigin } : {}),
  };

  const loggedBody = {
    ...requestBody,
    appSecret: '***REDACTED***',
  };

  const meta: AccountLookupMeta = {
    request: {
      method: 'POST',
      url,
      headers: loggedHeaders,
      body: loggedBody,
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    });
  } catch (err: any) {
    await logApiExchange({
      context: 'account/lookup:getAccountInformation',
      request: meta.request,
      error: err?.message ?? 'network_error',
    });
    return { found: false, error: err?.message ?? 'network_error', meta };
  }

  const responseText = await res.text();
  const responseBody = safeJsonParse(responseText);
  meta.response = {
    status: res.status,
    headers: headersToObject(res.headers),
    body: responseBody,
  };

  await logApiExchange({
    context: 'account/lookup:getAccountInformation',
    request: meta.request,
    response: {
      status: res.status,
      headers: meta.response.headers,
      body: responseBody,
    },
  });

  if (res.status === 404) {
    return { found: false, error: 'not_found', meta };
  }

  if (!res.ok) {
    return { found: false, error: `upstream_error_${res.status}`, meta };
  }

  const body = responseBody as {
    success?: boolean;
    account?: AccountInfo;
    profile?: {
      accountId?: string;
      displayName?: string;
      displayImage?: string;
      primaryNeupId?: string;
    };
    role?: string | null;
  } | null;
  if (!body || !body.success) {
    return { found: false, error: 'not_found', meta };
  }

  if (body.account) {
    return { found: true, account: body.account, meta };
  }

  if (body.profile?.accountId) {
    return {
      found: true,
      account: {
        accountId: body.profile.accountId,
        displayName: body.profile.displayName ?? '',
        displayImage: body.profile.displayImage ?? '',
        accountType: body.role ?? 'individual',
        neupId: body.profile.primaryNeupId ?? '',
      },
      meta,
    };
  }

  return { found: false, error: 'not_found', meta };
}

export async function getSignedAccountInformation(): Promise<SignedAccountLookupResult> {
  const url = SIGN_AND_GET_BASE;
  const appId = getAppId();
  const appSecret = getAppSecret();
  const authAccountCookie = await getAuthCookieServer();

  if (!appId || !appSecret) {
    return {
      found: false,
      error: 'missing_app_credentials',
      meta: {
        request: {
          method: 'POST',
          url,
          headers: { 'Content-Type': 'application/json' },
          body: {},
        },
      },
    };
  }

  if (!authAccountCookie) {
    return {
      found: false,
      error: 'missing_auth_cookie',
      meta: {
        request: {
          method: 'POST',
          url,
          headers: { 'Content-Type': 'application/json' },
          body: { appId, appSecret: '***REDACTED***' },
        },
      },
    };
  }

  const requestBody = { appId, appSecret };
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Cookie: `auth_account=${encodeURIComponent(authAccountCookie)}`,
  };
  const meta: SignedAccountLookupMeta = {
    request: {
      method: 'POST',
      url,
      headers: { 'Content-Type': 'application/json' },
      body: { appId, appSecret: '***REDACTED***' },
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    });
  } catch (err: any) {
    await logApiExchange({
      context: 'account/lookup:getSignedAccountInformation',
      request: meta.request,
      error: err?.message ?? 'network_error',
    });
    return { found: false, error: err?.message ?? 'network_error', meta };
  }

  const responseText = await res.text();
  const responseBody = safeJsonParse(responseText);
  meta.response = {
    status: res.status,
    headers: headersToObject(res.headers),
    body: responseBody,
  };

  await logApiExchange({
    context: 'account/lookup:getSignedAccountInformation',
    request: meta.request,
    response: {
      status: res.status,
      headers: meta.response.headers,
      body: responseBody,
    },
  });

  if (!res.ok) {
    return { found: false, error: `upstream_error_${res.status}`, meta };
  }

  const body = responseBody as {
    success?: boolean;
    token?: string | null;
    role?: unknown;
    account?: {
      id?: string;
      connectionId?: string;
      isMinor?: boolean;
      neupid?: string;
      neupId?: string;
    } | null;
    profile?: {
      displayName?: string | null;
      displayImage?: string | null;
      neupid?: string | null;
      neupId?: string | null;
    } | null;
  } | null;

  if (!body || body.success === false) {
    return { found: false, error: 'not_found', meta };
  }

  const accountId = body.account?.id ?? body.profile?.neupid ?? body.profile?.neupId ?? null;
  if (!accountId) {
    return { found: false, error: 'not_found', meta };
  }

  return {
    found: true,
    account: {
      accountId,
      connectionId: body.account?.connectionId ?? null,
      displayName: body.profile?.displayName ?? null,
      displayImage: body.profile?.displayImage ?? null,
      neupId: body.account?.neupid ?? body.account?.neupId ?? body.profile?.neupid ?? body.profile?.neupId ?? null,
      role: getRoleName(body.role),
      token: body.token ?? null,
      isMinor: typeof body.account?.isMinor === 'boolean' ? body.account.isMinor : null,
    },
    meta,
  };
}
