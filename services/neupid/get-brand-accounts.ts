/**
 * get-brand-accounts.ts
 *
 * Fetches accessible accounts from NeupID API for working-profile selection.
 */

'use server';

import { getAuthCookieServer } from '@/services/auth';
import { logAuthError } from '@/services/auth';
import { getNeupBridgeEnvironment } from '@/logica/neupid/api';
import { getBrandAccounts as getLogicaBrandAccounts } from '@/logica/neupid/accounts/getAccounts';
import { connectBrandAccount } from '@/logica/neupid/connections/create';

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

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetches accessible accounts from NeupID API.
 * Requires authentication via auth_account cookie.
 *
 * @returns BrandAccountsResponse with list of accessible accounts
 */
export async function getBrandAccounts(): Promise<BrandAccountsResponse> {
  try {
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

    const response = await getLogicaBrandAccounts({ authAccountToken: authCookie });
    if (!response.ok || !response.body.success) {
      await logAuthError('Accounts API returned success: false', {
        reason: 'api_failure',
        level: 'error',
        response: response.body,
        statusCode: response.status,
      });

      return {
        success: false,
        accounts: [],
        error: response.body.error || 'Failed to fetch accounts',
      };
    }

    return {
      success: true,
      accounts: (response.body.accounts ?? []).map((account) => ({
        id: account.id,
        displayName: account.displayName ?? account.id,
        displayImage: account.displayImage,
        status: account.status ?? 'active',
        isVerified: account.isVerified,
        accountType: account.accountType,
        permissions: account.permissions,
        lastActivityAt: account.lastActivityAt,
        neupId: account.neupId,
      })),
    };
  } catch (error) {
    await logAuthError(error as Error, {
      reason: 'fetch_error',
      level: 'error',
      operation: 'get_brand_accounts',
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

    const normalizedAccountId = accountId.trim();
    if (!normalizedAccountId) {
      return {
        success: false,
        error: 'Account ID is required.',
      };
    }

    const environment = getNeupBridgeEnvironment();
    const response = await connectBrandAccount({
      accountId: normalizedAccountId,
      authAccountToken: authCookie,
      appId: environment.appId,
      appSecret: environment.appSecret,
    });

    const payload = response.body;
    if (!response.ok || !payload?.success) {
      const errorMessage =
        (typeof payload?.error_description === 'string' && payload.error_description.trim()) ||
        (typeof payload?.error === 'string' && payload.error.trim()) ||
        `Failed to create brand account connection: HTTP ${response.status}`;

      await logAuthError(`Failed to create brand account connection: ${response.status}`, {
        reason: 'api_error',
        level: 'error',
        statusCode: response.status,
        response: payload,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      connectionId: payload.connectionId ?? normalizedAccountId,
      status: payload.status ?? 'active',
    };
  } catch (error) {
    await logAuthError(error as Error, {
      reason: 'fetch_error',
      level: 'error',
      operation: 'create_brand_account_connection',
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
