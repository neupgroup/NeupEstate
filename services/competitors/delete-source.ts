'use server';

import { deleteCompetitorSource } from './service';
import { revalidatePath } from 'next/cache';

export async function deleteCompetitorSourceAction(
  id: string,
  competitorId?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteCompetitorSource(id);
    revalidatePath('/manage/intelligence/competition');
    if (competitorId) {
      revalidatePath(`/manage/intelligence/competition/${competitorId}`);
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
