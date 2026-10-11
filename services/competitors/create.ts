'use server';

import { createCompetitor } from './service';
import { revalidatePath } from 'next/cache';

export async function createCompetitorAction(
  name: string,
  description?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!name?.trim()) return { success: false, error: 'Name is required.' };
  try {
    await createCompetitor(name.trim(), description?.trim() || undefined);
    revalidatePath('/manage/intelligence/competition');
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
