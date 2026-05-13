'use server';

import { getBrandAccounts } from '@/services/neupid/get-brand-accounts';

/**
 * Server action to fetch brand accounts.
 * This is used by the client component to fetch brand accounts on demand.
 */
export async function fetchBrandAccountsAction() {
  return await getBrandAccounts();
}
