"use server";

import { getIdentity } from '@/services/neupid/get-identity';

export async function getCurrentAccountId(): Promise<string | null> {
  const identity = await getIdentity();
  return identity.authenticated ? identity.account.accountId : null;
}
