import { getAccounts } from './id/lookup';
export { getAccounts };

import { logger } from "@neup/logica/logger";
import type { User } from '@/types';

export async function listAccounts(): Promise<User[]> {
  try {
    // Account records are the source of truth; this legacy User projection is currently empty.
    return [];
  } catch (error) {
    await logger().type('listAccounts').data({ error: String(error), details: {} }).log();
    return [];
  }
}
