'use server';

import { prisma } from '@neup/core/database/prisma';
import { revalidatePath } from 'next/cache';

export async function updateCompetitorCrawlRulesAction(
  competitorId: string,
  rules: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$executeRaw`
      UPDATE "competitor"
      SET "crawlRules" = ${JSON.stringify(rules)}::jsonb, "updatedAt" = NOW()
      WHERE "id" = ${competitorId}
    `;
    revalidatePath('/manage/intelligence/competition');
    revalidatePath(`/manage/intelligence/competition/${competitorId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
