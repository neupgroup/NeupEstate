import { headers } from 'next/headers';
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

export type AccountLookupInput =
  | { accountId: string; neupId?: never }
  | { neupId: string; accountId?: never };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOOKUP_BASE = 'https://neupgroup.com/account/bridge/api.v1/accounts/lookup';

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

  const meta: AccountLookupMeta = {
    request: {
      method: 'POST',
      url,
      headers: requestHeaders,
      body: requestBody,
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
