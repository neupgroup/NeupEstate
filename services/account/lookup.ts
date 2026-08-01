import { lookup, type LookupResponseBody } from '@/logica/neupid/lookup';
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

function logAccountLookupStatus(stage: string, details: Record<string, unknown>) {
  console.log('[account.lookup]', {
    stage,
    ...details,
  });
}

// ---------------------------------------------------------------------------
// Service function
// ---------------------------------------------------------------------------

export async function getAccountInformation(
  input: AccountLookupInput,
): Promise<AccountLookupResult> {
  if (input.neupId) {
    return {
      found: false,
      error: 'neupid_lookup_requires_logica_support',
      meta: {
        request: {
          method: 'POST',
          url: '/bridge/api.v1/accounts/lookup',
          headers: { 'Content-Type': 'application/json' },
          body: { neupId: input.neupId },
        },
      },
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

  const response = await lookup({
    accountId,
    fields: ACCOUNT_LOOKUP_FIELDS,
  });
  logAccountLookupStatus('account_id_response', {
    accountId,
    ok: response.ok,
    status: response.status,
    success: response.body.success,
    error: response.body.error,
    reason: response.body.reason,
    responseAccountId: response.body.accountId,
    neupid: response.body.neupid,
    displayName: response.body.displayName,
    hasDisplayImage: Boolean(response.body.displayImage),
    accountType: response.body.accountType,
  });
  meta.response = {
    status: response.status,
    headers: headersToObject(response.headers),
    body: response.body,
  };

  if (!response.ok || !response.body.success || !response.body.accountId) {
    logAccountLookupStatus('account_id_not_found', {
      accountId,
      error: getLookupError(response.body),
    });
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
    const response = await lookup({
      authAccountToken: authAccountCookie,
      fields: ACCOUNT_LOOKUP_FIELDS,
    });
    logAccountLookupStatus('signed_response', {
      ok: response.ok,
      status: response.status,
      success: response.body.success,
      error: response.body.error,
      reason: response.body.reason,
      responseAccountId: response.body.accountId,
      neupid: response.body.neupid,
      displayName: response.body.displayName,
      hasDisplayImage: Boolean(response.body.displayImage),
      accountType: response.body.accountType,
      connectionId: response.body.connectionId,
      isMinor: response.body.isMinor,
    });
    meta.response = {
      status: response.status,
      headers: headersToObject(response.headers),
      body: response.body,
    };

    if (!response.ok || !response.body.success || !response.body.accountId) {
      logAccountLookupStatus('signed_not_found', {
        error: getLookupError(response.body),
      });
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
    logAccountLookupStatus('signed_error', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return {
      found: false,
      error: error instanceof Error ? error.message : 'not_found',
      meta,
    };
  }
}

function getLookupError(body: LookupResponseBody): string {
  return body.error ?? body.reason ?? 'not_found';
}
