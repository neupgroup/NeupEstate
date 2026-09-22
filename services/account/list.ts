import { getAccounts } from './id/lookup';
export { getAccounts };

import { logProblem } from '@/services/problem-service';
import type { User } from '@/types';

export async function listAccounts(): Promise<User[]> {
  try {
    // Account records are the source of truth; this legacy User projection is currently empty.
    return [];
  } catch (error) {
    await logProblem(error, 'listAccounts');
    return [];
  }
}
