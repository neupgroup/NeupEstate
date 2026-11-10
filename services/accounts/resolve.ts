"use server";

import { resolveAccount } from './id/lookup';

export async function resolveAccountAction(aid: string | null): Promise<{ success: boolean; accountId?: string; error?: string }> {
  try {
    return { success: true, accountId: await resolveAccount(aid) };
  } catch (error) {
    return { success: false, error: 'Failed to resolve account.' };
  }
}
