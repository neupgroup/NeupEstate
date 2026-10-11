'use server';

import { getCompetitors } from './service';
import { crawlCompetitorSourcesAction } from './crawl';
import { revalidatePath } from 'next/cache';

export async function crawlAllCompetitorSourcesAction(): Promise<
  | {
      success: true;
      competitorsCount: number;
      crawledCount: number;
      discoveredCount: number;
      savedCount: number;
      errors: string[];
    }
  | { success: false; error: string }
> {
  try {
    const competitors = await getCompetitors();
    let crawledCount = 0;
    let discoveredCount = 0;
    let savedCount = 0;
    const errors: string[] = [];

    for (const competitor of competitors) {
      const result = await crawlCompetitorSourcesAction(competitor.id);

      if (!result.success) {
        errors.push(`${competitor.name}: ${result.error}`);
        continue;
      }

      crawledCount += result.crawledCount;
      discoveredCount += result.discoveredCount;
      savedCount += result.savedCount;

      for (const error of result.errors) {
        errors.push(`${competitor.name}: ${error}`);
      }
    }

    revalidatePath('/manage/intelligence');

    return {
      success: true,
      competitorsCount: competitors.length,
      crawledCount,
      discoveredCount,
      savedCount,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to crawl competitor sources.',
    };
  }
}
