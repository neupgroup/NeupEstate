import { logica } from '#/logica';
import { getAuthCookieServer } from '@/services/auth/cookie';

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

type LookupErrorBody = {
  error?: string;
  reason?: string;
};

export type AccountLookupInput =
  | { accountId: string; neupId?: never }
  | { neupId: string; accountId?: never };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

const ACCOUNT_LOOKUP_FIELDS = [
  'neupid',
  'displayName',
  'accountId',
  'displayImage',
  'isMinor',
  'connectionId',
  'accountType',
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readProfileValue(profile: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = readString(profile[key]);
    if (value) return value;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Service function
// ---------------------------------------------------------------------------

export async function getAccountInformation(
  input: AccountLookupInput,
): Promise<AccountLookupResult> {
  if (input.neupId) {
    const meta: AccountLookupMeta = {
      request: {
        method: 'POST',
        url: '/bridge/api.v1/profile',
        headers: { 'Content-Type': 'application/json' },
        body: { neupId: input.neupId },
      },
    };

    const response = await logica.account.lookup.byNeupId(input.neupId).get();
    meta.response = {
      status: response.status,
      headers: headersToObject(response.headers),
      body: response.body,
    };

    const responseBody = asRecord(response.body);
    const profile = asRecord(responseBody?.profile) ?? responseBody;

    if (!response.ok || !profile) {
      return { found: false, error: 'not_found', meta };
    }

    const accountId = readProfileValue(profile, 'accountId', 'aid', 'id');
    if (!accountId) {
      return { found: false, error: 'not_found', meta };
    }

    return {
      found: true,
      account: {
        accountId,
        displayName: readProfileValue(profile, 'displayName', 'name') ?? '',
        displayImage: readProfileValue(profile, 'displayImage', 'image', 'photoUrl') ?? '',
        accountType: readProfileValue(profile, 'accountType', 'type') ?? 'individual',
        neupId: readProfileValue(profile, 'neupid', 'neupId', 'nid') ?? input.neupId,
      },
      meta,
    };
  }

  const accountId = 'accountId' in input ? input.accountId : undefined;
  if (!accountId) {
    return {
      found: false,
      error: 'missing_account_id',
      meta: {
        request: {
          method: 'POST',
          url: '/bridge/api.v1/accounts/lookup',
          headers: { 'Content-Type': 'application/json' },
          body: {},
        },
      },
    };
  }

  const meta: AccountLookupMeta = {
    request: {
      method: 'POST',
      url: '/bridge/api.v1/accounts/lookup',
      headers: { 'Content-Type': 'application/json' },
      body: {
        accountId,
        fields: ACCOUNT_LOOKUP_FIELDS.join(','),
      },
    },
  };

  const response = await logica.account(accountId).get(ACCOUNT_LOOKUP_FIELDS);
  meta.response = {
    status: response.status,
    headers: headersToObject(response.headers),
    body: response.body,
  };

  if (!response.ok || !response.body.success || !response.body.accountId) {
    return { found: false, error: 'not_found', meta };
  }

  return {
    found: true,
    account: {
      accountId: response.body.accountId,
      displayName: response.body.displayName ?? '',
      displayImage: response.body.displayImage ?? '',
      accountType: response.body.accountType ?? 'individual',
      neupId: response.body.neupid ?? '',
    },
    meta,
  };
}

export async function getSignedAccountInformation(): Promise<SignedAccountLookupResult> {
  const authAccountCookie = await getAuthCookieServer();

  if (!authAccountCookie) {
    return {
      found: false,
      error: 'missing_auth_cookie',
      meta: {
        request: {
          method: 'POST',
          url: '/bridge/api.v1/connection/sign&get',
          headers: { 'Content-Type': 'application/json' },
          body: {},
        },
      },
    };
  }

  const meta: SignedAccountLookupMeta = {
    request: {
      method: 'POST',
      url: '/bridge/api.v1/connection/sign&get',
      headers: { 'Content-Type': 'application/json' },
      body: {},
    },
  };

  try {
    const response = await logica.account.lookup.current.get(authAccountCookie, ACCOUNT_LOOKUP_FIELDS);
    meta.response = {
      status: response.status,
      headers: headersToObject(response.headers),
      body: response.body,
    };

    if (!response.ok || !response.body.success || !response.body.accountId) {
      return {
        found: false,
        error: getLookupError(response.body),
        meta,
      };
    }

    return {
      found: true,
      account: {
        accountId: response.body.accountId,
        connectionId: response.body.connectionId ?? null,
        displayName: response.body.displayName ?? null,
        displayImage: response.body.displayImage ?? null,
        neupId: response.body.neupid ?? null,
        role: null,
        token: null,
        isMinor: response.body.isMinor ?? null,
      },
      meta,
    };
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'not_found',
      meta,
    };
  }
}

function getLookupError(body: LookupErrorBody): string {
  return body.error ?? body.reason ?? 'not_found';
}
