/**
 * get-brand-accounts.ts
 *
 * Fetches brand/branch accounts from NeupID API.
 * These are the only accounts that can be used to create agencies.
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
  capabilities: string[];
  lastActivityAt: string | null;
  neupId: string | null;
};

export type BrandAccountsResponse = {
  success: boolean;
  accounts: BrandAccount[];
  error?: string;
};

// ─── API Configuration ───────────────────────────────────────────────────────

const BRANDS_ENDPOINT = 'https://neupgroup.com/account/bridge/api.v1/accounts/brands';

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetches brand/branch accounts from NeupID API.
 * Requires authentication via auth_account cookie.
 *
 * @returns BrandAccountsResponse with list of brand accounts
 */
export async function getBrandAccounts(): Promise<BrandAccountsResponse> {
  try {
    // Get the auth_account cookie
    const authCookie = await getAuthCookieServer();

    if (!authCookie) {
      await logAuthError('No auth cookie found when fetching brand accounts', {
        reason: 'missing_auth_cookie',
        level: 'error',
      });

      return {
        success: false,
        accounts: [],
        error: 'Authentication required. Please log in.',
      };
    }

    // Make request to NeupID API with auth cookie
    const response = await fetch(BRANDS_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_account=${authCookie}`,
      },
      credentials: 'include',
      cache: 'no-store' // Don't cache brand accounts
    });



    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      
      await logAuthError(`Failed to fetch brand accounts: ${response.status}`, {
        reason: 'api_error',
        level: 'error',
        statusCode: response.status,
        errorText,
      });

      return {
        success: false,
        accounts: [],
        error: `Failed to fetch brand accounts: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      await logAuthError('Brand accounts API returned success: false', {
        reason: 'api_failure',
        level: 'error',
        response: data,
      });

      return {
        success: false,
        accounts: [],
        error: data.error || 'Failed to fetch brand accounts',
      };
    }

    // Validate and return accounts
    const accounts: BrandAccount[] = Array.isArray(data.accounts) ? data.accounts : [];

    return {
      success: true,
      accounts,
    };
  } catch (error) {
    await logAuthError(error as Error, {
      reason: 'fetch_error',
      level: 'error',
      operation: 'get_brand_accounts',
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
