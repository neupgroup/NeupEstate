'use server';

import { addCompetitorSource } from './service';
import { revalidatePath } from 'next/cache';

export async function addCompetitorSourceAction(
  competitorId: string,
  type: 'sitemap' | 'link' | 'manual',
  value: string,
): Promise<{ success: boolean; error?: string }> {
  if (!value?.trim()) return { success: false, error: 'URL is required.' };
  try {
    await addCompetitorSource(competitorId, type, value.trim());
    revalidatePath('/manage/intelligence/competition');
    revalidatePath(`/manage/intelligence/competition/${competitorId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
