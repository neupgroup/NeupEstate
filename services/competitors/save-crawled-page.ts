'use server';

import { getCompetitorById, upsertCompetitorPage } from './service';
import { fetchPageSourceCode } from '@/services/crawl/fetch-page-source';
import { extractVisibleHtml } from '@/services/crawl/visible-html';
import { shouldIndexCrawledUrl } from '@/services/crawl/crawl-rules';
import { revalidatePath } from 'next/cache';
import { getHttpStatusFromError } from './crawl/_helpers';

export async function saveCrawledCompetitorPageAction(
  competitorId: string,
  url: string,
  title?: string,
  description?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const rawHtml = await fetchPageSourceCode(url);
    const visibleHtml = extractVisibleHtml(rawHtml);
    const competitor = await getCompetitorById(competitorId);
    if (!competitor) {
      return { success: false, error: 'Competitor not found.' };
    }
    if (!shouldIndexCrawledUrl(url, competitor.crawlRules)) {
      return { success: false, error: 'This page does not match the competitor crawl rules.' };
    }
    await upsertCompetitorPage({
      competitorId,
      source: url,
      title: title?.trim() || new URL(url).pathname.split('/').filter(Boolean).join(' / ') || 'Listing',
      description: description?.trim() || undefined,
      lastLoggedStatus: null,
      lastLoggedOn: new Date(),
    });

    revalidatePath('/manage/intelligence/competition');
    revalidatePath(`/manage/intelligence/competition/${competitorId}`);
    revalidatePath('/manage/intelligence/logs');

    return { success: true };
  } catch (error) {
    const status = getHttpStatusFromError(error);
    if (status) {
      await upsertCompetitorPage({
        competitorId,
        source: url,
        title: title?.trim() || new URL(url).pathname.split('/').filter(Boolean).join(' / ') || 'Listing',
        description: description?.trim() || undefined,
        lastLoggedStatus: status,
        lastLoggedOn: new Date(),
      });
      revalidatePath('/manage/intelligence/logs');
      return { success: true };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save crawled page.' };
  }
}
