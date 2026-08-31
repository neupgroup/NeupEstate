'use server';

import { getAccountId } from '@/services/auth/account';

export async function getServerAccountId(): Promise<string | null> {
  return getAccountId();
}
