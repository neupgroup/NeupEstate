/**
 * lookup.ts
 *
 * getAccountInformation — resolves public profile fields for an account
 * by either accountId (UUID) or neupId (handle, e.g. "@neupcloud").
 *
 * Calls the NeupID public HTTP endpoint:
 *   GET https://neupgroup.com/account/bridge/api.v1/accounts/lookup
 *
 * Server-only — never import this in client components.
 *
 * Usage:
 *   const result = await getAccountInformation({ accountId: 'eb58bed4-...' });
 *   const result = await getAccountInformation({ neupId: '@neupcloud' });
 *
 *   if (result.found) {
 *     console.log(result.account.displayName);
 *   }
 */

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

export type AccountLookupResult =
  | { found: true;  account: AccountInfo }
  | { found: false; error: string };

export type AccountLookupInput =
  | { accountId: string; neupId?: never }
  | { neupId: string;    accountId?: never };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOOKUP_BASE =
  'https://neupgroup.com/account/bridge/api.v1/accounts/lookup';

// ---------------------------------------------------------------------------
// Service function
// ---------------------------------------------------------------------------

/**
 * Fetches public account information from the NeupID HTTP API.
 *
 * @param input - Either `{ accountId }` or `{ neupId }` — exactly one required.
 * @returns AccountLookupResult
 */
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

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Don't cache — always want fresh identity data
      cache: 'no-store',
    });
  } catch (err: any) {
    return { found: false, error: err?.message ?? 'network_error' };
  }

  if (res.status === 404) {
    return { found: false, error: 'not_found' };
  }

  if (!res.ok) {
    return { found: false, error: `upstream_error_${res.status}` };
  }

  let body: { success: boolean; account?: AccountInfo };
  try {
    body = await res.json();
  } catch {
    return { found: false, error: 'invalid_response' };
  }

  if (!body.success || !body.account) {
    return { found: false, error: 'not_found' };
  }

  return { found: true, account: body.account };
}
