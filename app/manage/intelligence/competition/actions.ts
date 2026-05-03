'use server';

import {
  getCompetitors,
  createCompetitor,
  deleteCompetitor,
  addCompetitorSource,
  deleteCompetitorSource,
  type Competitor,
  type CompetitorSource,
} from '@/services/competitor-service';
import { revalidatePath } from 'next/cache';

export type { Competitor, CompetitorSource };

export async function getCompetitorsAction(): Promise<Competitor[]> {
  return getCompetitors();
}

export async function createCompetitorAction(
  name: string,
  description?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!name?.trim()) return { success: false, error: 'Name is required.' };
  try {
    await createCompetitor(name.trim(), description?.trim() || undefined);
    revalidatePath('/manage/intelligence/competition');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteCompetitorAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteCompetitor(id);
    revalidatePath('/manage/intelligence/competition');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function addCompetitorSourceAction(
  competitorId: string,
  type: 'sitemap' | 'link' | 'manual',
  value: string,
): Promise<{ success: boolean; error?: string }> {
  if (!value?.trim()) return { success: false, error: 'URL is required.' };
  try {
    await addCompetitorSource(competitorId, type, value.trim());
    revalidatePath('/manage/intelligence/competition');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteCompetitorSourceAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteCompetitorSource(id);
    revalidatePath('/manage/intelligence/competition');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
