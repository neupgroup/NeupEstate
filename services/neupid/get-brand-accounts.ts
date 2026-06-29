/**
 * get-brand-accounts.ts
 *
 * Fetches accessible accounts from NeupID API for working-profile selection.
 */

'use server';

import { getAuthCookieServer } from '@/services/auth';
import { logAuthError } from '@/services/auth';

// ─── Types ───────────────────────────────────────────────────────────────────

export type BrandAccount = {
  id: string;
  displayName: string;
  displayImage: string | null;
  status: string;
  isVerified: boolean;
  accountType: string;
  permissions: string[];
  lastActivityAt: string | null;
  neupId: string | null;
};

export type BrandAccountsResponse = {
  success: boolean;
  accounts: BrandAccount[];
  error?: string;
};

export type CreateBrandAccountConnectionResult =
  | {
      success: true;
      connectionId: string;
      status: string;
    }
  | {
      success: false;
      error: string;
    };

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function pickStringArray(record: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function pickBoolean(record: Record<string, unknown>, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return fallback;
}

function normalizeBrandAccount(value: unknown): BrandAccount | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const id = pickString(record, ['id', 'accountId', 'account_id']);
  if (!id) return null;

  return {
    id,
    displayName: pickString(record, ['displayName', 'display_name', 'name']) ?? id,
    displayImage: pickString(record, ['displayImage', 'display_image', 'image', 'logoUrl']),
    status: pickString(record, ['status']) ?? 'active',
    isVerified: pickBoolean(record, ['isVerified', 'is_verified']),
    accountType: pickString(record, ['accountType', 'account_type', 'type']) ?? 'brand',
    permissions: pickStringArray(record, ['permissions', 'capabilities']),
    lastActivityAt: pickString(record, ['lastActivityAt', 'last_activity_at']),
    neupId: pickString(record, ['neupId', 'neup_id', 'neupid', 'nid', 'handle']),
  };
}

// ─── API Configuration ───────────────────────────────────────────────────────

const ACCOUNTS_ENDPOINT_PATH = '/bridge/api.v1/accounts';
const BRAND_CONNECTIONS_ENDPOINT_PATH = '/bridge/api.v1/accounts/brands';

function getNeupAuthUrl(): string | null {
  const base = process.env.NEUP_AUTH_URL?.trim();
  return base || null;
}

function buildNeupAccountUrl(base: string, endpointPath: string): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = endpointPath.replace(/^\/+/, '');
  return new URL(normalizedPath, normalizedBase).toString();
}

function getAppId(): string {
  return process.env.NEUP_APP_ID?.trim() || '';
}

function getAppSecret(): string {
  return process.env.NEUP_APP_SECRET?.trim() || '';
}

function buildRequestDebugContext(args: {
  url: string;
  method: 'GET' | 'POST';
  cookiePresent: boolean;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}) {
  return {
    requestUrl: args.url,
    requestMethod: args.method,
    requestCookiePresent: args.cookiePresent,
    requestQuery: args.query ?? {},
    requestBody: args.body,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetches accessible accounts from NeupID API.
 * Requires authentication via auth_account cookie.
 *
 * @returns BrandAccountsResponse with list of accessible accounts
 */
export async function getBrandAccounts(): Promise<BrandAccountsResponse> {
  try {
    const authBaseUrl = getNeupAuthUrl();
    if (!authBaseUrl) {
      await logAuthError('The NEUP_AUTH_URL has not been set.', {
        reason: 'missing_auth_base_url',
        level: 'error',
        operation: 'get_brand_accounts',
      });

      return {
        success: false,
        accounts: [],
        error: 'Something in server went wrong.',
      };
    }

    // Get the auth_account cookie
    const authCookie = await getAuthCookieServer();

    if (!authCookie) {
      await logAuthError('No auth cookie found when fetching accessible accounts', {
        reason: 'missing_auth_cookie',
        level: 'error',
      });

      return {
        success: false,
        accounts: [],
        error: 'Authentication required. Please log in.',
      };
    }

    const brandsEndpoint = buildNeupAccountUrl(authBaseUrl, ACCOUNTS_ENDPOINT_PATH);
    const requestContext = buildRequestDebugContext({
      url: brandsEndpoint,
      method: 'GET',
      cookiePresent: Boolean(authCookie),
    });

    // Make request to NeupID API with auth cookie
    const response = await fetch(brandsEndpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_account=${authCookie}`,
      },
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');

      await logAuthError(`Failed to fetch accessible accounts: ${response.status}`, {
        reason: 'api_error',
        level: 'error',
        statusCode: response.status,
        errorText,
        ...requestContext,
      });

      return {
        success: false,
        accounts: [],
        error: `Failed to fetch accounts: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      await logAuthError('Accounts API returned success: false', {
        reason: 'api_failure',
        level: 'error',
        response: data,
        ...requestContext,
      });

      return {
        success: false,
        accounts: [],
        error: data.error || 'Failed to fetch accounts',
      };
    }

    const rawAccounts: unknown[] = Array.isArray(data.accounts) ? data.accounts : [];
    const accounts = rawAccounts
      .map(normalizeBrandAccount)
      .filter((account): account is BrandAccount => Boolean(account));

    return {
      success: true,
      accounts,
    };
  } catch (error) {
    await logAuthError(error as Error, {
      reason: 'fetch_error',
      level: 'error',
      operation: 'get_brand_accounts',
      requestUrl: getNeupAuthUrl()
        ? buildNeupAccountUrl(getNeupAuthUrl() as string, ACCOUNTS_ENDPOINT_PATH)
        : undefined,
      requestMethod: 'GET',
    });

    return {
      success: false,
      accounts: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Gets a specific brand account by ID.
 *
 * @param brandId - The brand account ID
 * @returns The brand account or null if not found
 */
export async function getBrandAccountById(brandId: string): Promise<BrandAccount | null> {
  const result = await getBrandAccounts();

  if (!result.success) {
    return null;
  }

  return result.accounts.find(account => account.id === brandId) || null;
}

/**
 * Checks if a brand account exists.
 *
 * @param brandId - The brand account ID
 * @returns True if the brand account exists
 */
export async function brandAccountExists(brandId: string): Promise<boolean> {
  const account = await getBrandAccountById(brandId);
  return account !== null;
}

/**
 * Creates an application connection for a brand/branch account through
 * Neup Account's POST /bridge/api.v1/accounts/brands endpoint.
 */
export async function createBrandAccountConnection(accountId: string): Promise<CreateBrandAccountConnectionResult> {
  try {
    const authBaseUrl = getNeupAuthUrl();
    if (!authBaseUrl) {
      await logAuthError('The NEUP_AUTH_URL has not been set.', {
        reason: 'missing_auth_base_url',
        level: 'error',
        operation: 'create_brand_account_connection',
      });
      return {
        success: false,
        error: 'Something in server went wrong.',
      };
    }

    const authCookie = await getAuthCookieServer();
    if (!authCookie) {
      await logAuthError('No auth cookie found when creating brand account connection', {
        reason: 'missing_auth_cookie',
        level: 'error',
      });
      return {
        success: false,
        error: 'Authentication required. Please log in.',
      };
    }

    const appId = getAppId();
    const appSecret = getAppSecret();
    if (!appId || !appSecret) {
      await logAuthError('Missing NEUP_APP_ID or NEUP_APP_SECRET when creating brand account connection', {
        reason: 'missing_app_credentials',
        level: 'error',
      });
      return {
        success: false,
        error: 'Missing application credentials for brand account connection.',
      };
    }

    const normalizedAccountId = accountId.trim();
    if (!normalizedAccountId) {
      return {
        success: false,
        error: 'Account ID is required.',
      };
    }

    const brandsEndpoint = buildNeupAccountUrl(authBaseUrl, BRAND_CONNECTIONS_ENDPOINT_PATH);
    const requestContext = buildRequestDebugContext({
      url: brandsEndpoint,
      method: 'POST',
      cookiePresent: Boolean(authCookie),
      body: {
        appId,
        appSecretPresent: Boolean(appSecret),
        accountId: normalizedAccountId,
      },
    });
    const response = await fetch(brandsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_account=${authCookie}`,
      },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({
        appId,
        appSecret,
        accountId: normalizedAccountId,
      }),
    });

    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok || !payload?.success) {
      const errorMessage =
        (typeof payload?.error_description === 'string' && payload.error_description.trim()) ||
        (typeof payload?.error === 'string' && payload.error.trim()) ||
        `Failed to create brand account connection: ${response.statusText}`;

      await logAuthError(`Failed to create brand account connection: ${response.status}`, {
        reason: 'api_error',
        level: 'error',
        statusCode: response.status,
        response: payload,
        ...requestContext,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      connectionId: pickString(payload, ['connectionId', 'connection_id']) ?? normalizedAccountId,
      status: pickString(payload, ['status']) ?? 'active',
    };
  } catch (error) {
    await logAuthError(error as Error, {
      reason: 'fetch_error',
      level: 'error',
      operation: 'create_brand_account_connection',
      requestUrl: getNeupAuthUrl()
        ? buildNeupAccountUrl(getNeupAuthUrl() as string, BRAND_CONNECTIONS_ENDPOINT_PATH)
        : undefined,
      requestMethod: 'POST',
      requestBody: {
        accountId: accountId.trim(),
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
