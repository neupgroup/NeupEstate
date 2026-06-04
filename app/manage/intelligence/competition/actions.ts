'use server';

import {
  getCompetitors,
  createCompetitor,
  deleteCompetitor,
  addCompetitorSource,
  deleteCompetitorSource,
  getCompetitorById,
  getCompetitorPages,
  upsertCompetitorPage,
  type Competitor,
} from '@/services/competitor-service';
import { crawlSitemap } from '@/services/crawl/sitemap';
import { crawlLinks } from '@/services/crawl/links';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';
import { extractVisibleHtml } from '@/services/crawl/visible-html';
import { revalidatePath } from 'next/cache';

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
    revalidatePath(`/manage/intelligence/competition/${id}`);
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
    revalidatePath(`/manage/intelligence/competition/${competitorId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

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

export async function crawlCompetitorSourcesAction(
  competitorId: string,
): Promise<
  | { success: true; crawledCount: number; discoveredCount: number; savedCount: number; errors: string[] }
  | { success: false; error: string }
> {
  try {
    const competitor = await getCompetitorById(competitorId);
    if (!competitor) return { success: false, error: 'Competitor not found.' };

    const existingPages = await getCompetitorPages(competitorId);
    const existingUrls = new Set(existingPages.map((page) => page.source));

    let crawledCount = 0;
    let discoveredCount = 0;
    let savedCount = 0;
    const errors: string[] = [];

    for (const source of competitor.sources) {
      try {
        let urls: string[] = [];

        if (source.type === 'sitemap') {
          const result = await crawlSitemap(source.value);
          if (result.error) {
            errors.push(`${source.value}: ${result.error}`);
            continue;
          }
          urls = result.urls;
        } else {
          const urlCandidate = source.value.trim();
          try {
            new URL(urlCandidate);
          } catch {
            continue;
          }

          const result = await crawlLinks(urlCandidate);
          if (result.error) {
            errors.push(`${source.value}: ${result.error}`);
            continue;
          }
          urls = result.links;
        }

        crawledCount += urls.length;

        for (const url of urls) {
          if (existingUrls.has(url)) continue;

          discoveredCount += 1;

          try {
            const rawHtml = await fetchPageSourceCode(url);
            const visibleHtml = extractVisibleHtml(rawHtml);
            await upsertCompetitorPage({
              competitorId,
              title: new URL(url).pathname.split('/').filter(Boolean).join(' / ') || 'Listing',
              source: url,
              visibleHtml,
            });
            savedCount += 1;
            existingUrls.add(url);
          } catch (error) {
            errors.push(`${url}: ${error instanceof Error ? error.message : 'Failed to save page'}`);
          }
        }
      } catch (error) {
        errors.push(`${source.value}: ${error instanceof Error ? error.message : 'Failed to crawl source'}`);
      }
    }

    revalidatePath('/manage/intelligence/competition');
    revalidatePath(`/manage/intelligence/competition/${competitorId}`);

    return { success: true, crawledCount, discoveredCount, savedCount, errors };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to crawl sources.' };
  }
}

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

export async function saveCrawledCompetitorPageAction(
  competitorId: string,
  url: string,
  title?: string,
  description?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const rawHtml = await fetchPageSourceCode(url);
    const visibleHtml = extractVisibleHtml(rawHtml);
    await upsertCompetitorPage({
      competitorId,
      source: url,
      title: title?.trim() || new URL(url).pathname.split('/').filter(Boolean).join(' / ') || 'Listing',
      description: description?.trim() || undefined,
      visibleHtml,
    });

    revalidatePath('/manage/intelligence/competition');
    revalidatePath(`/manage/intelligence/competition/${competitorId}`);
    revalidatePath('/manage/intelligence/logs');

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to save crawled page.' };
  }
}
