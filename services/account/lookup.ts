import { getNeupBridgeEnvironment } from '@/logica/neupid/api';
import { getProfile } from '@/logica/neupid/connections/getInfo';
import { getNeupConnectionAccountInfo } from '@/logica/neupid/connection';
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

  const environment = getNeupBridgeEnvironment();
  const meta: AccountLookupMeta = {
    request: {
      method: 'POST',
      url: '/bridge/api.v1/accounts/lookup',
      headers: { 'Content-Type': 'application/json' },
      body: {
        accountId,
        appId: environment.appId,
        appSecret: '***REDACTED***',
      },
    },
  };

  const response = await getProfile({
    appId: environment.appId,
    appSecret: environment.appSecret,
    accountId,
  });
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
      accountType: 'individual',
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
    const info = await getNeupConnectionAccountInfo(authAccountCookie);
    return {
      found: true,
      account: {
        accountId: info.accountId,
        connectionId: info.connectionId,
        displayName: info.displayName,
        displayImage: info.displayImage,
        neupId: null,
        role: null,
        token: null,
        isMinor: null,
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
