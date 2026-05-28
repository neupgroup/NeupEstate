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
    method: 'GET';
    url: string;
    headers: Record<string, string>;
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
  const params = new URLSearchParams();
  if (input.accountId) {
    params.set('accountId', input.accountId);
  } else {
    params.set('neupId', input.neupId!);
  }

  const url = `${LOOKUP_BASE}?${params.toString()}`;

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
      method: 'GET',
      url,
      headers: requestHeaders,
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
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

  const body = responseBody as { success?: boolean; account?: AccountInfo } | null;
  if (!body || !body.success || !body.account) {
    return { found: false, error: 'not_found', meta };
  }

  return { found: true, account: body.account, meta };
}

