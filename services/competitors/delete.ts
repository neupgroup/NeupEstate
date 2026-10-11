'use server';

import { deleteCompetitor } from './service';
import { revalidatePath } from 'next/cache';

export async function deleteCompetitorAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteCompetitor(id);
    revalidatePath('/manage/intelligence/competition');
    revalidatePath(`/manage/intelligence/competition/${id}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
