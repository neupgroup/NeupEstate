"use server";

import { resolveAccount } from './id/lookup';
import { logger } from '@neup/logica/logger';

export async function resolveAccountAction(aid: string | null): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    return { success: true, accountId: await resolveAccount(aid) };
  } catch (error) {
    await logger.error(error);
    return { success: false, error: 'Failed to resolve account.' };
  }
}
