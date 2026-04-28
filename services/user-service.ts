'use server';

import { logProblem } from './problem-service';
import type { User } from '@/types';

// Note: There is no User model in the schema. This service returns empty for now.
// If you need users, add a User model to schema.prisma or map from Account.

export async function getUsers(): Promise<User[]> {
  try {
    // No User model exists in the current schema
    return [];
  } catch (e) {
    await logProblem(e, 'getUsers service');
    return [];
  }
}
