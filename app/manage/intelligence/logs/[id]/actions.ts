'use server';

import { crawlSitemap } from '@/services/crawl/sitemap';
import { crawlLinks } from '@/services/crawl/links';
import { getCompetitorById, getCompetitorPages, upsertCompetitorPage } from '@/services/competitor-service';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';
import { extractVisibleHtml } from '@/services/crawl/visible-html';
import { shouldIndexCrawledUrl } from '@/services/crawl/crawl-rules';
import { logProblem } from '@/services/problem-service';
import { revalidatePath } from 'next/cache';

function getHttpStatusFromError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/status:\s*(\d{3})/i);
  return match ? match[1] : null;
}

export async function crawlCompetitorSourcesAction(competitorId: string) {
  try {
    const competitor = await getCompetitorById(competitorId);
    if (!competitor) {
      return { success: false, error: 'Competitor not found' };
    }

    const existingProperties = await getCompetitorPages(competitorId);
    const existingUrls = new Set(existingProperties.map(p => p.source));

    let discoveredCount = 0;
    let savedCount = 0;
    const errors: string[] = [];

    // Process each source
    for (const source of competitor.sources) {
      try {
        let urls: string[] = [];

        if (source.type === 'sitemap') {
          // Crawl sitemap
          const result = await crawlSitemap(source.value);
          if (result.error) {
            errors.push(`Sitemap error (${source.value}): ${result.error}`);
            continue;
          }
          urls = result.urls;
        } else if (source.type === 'link') {
          // Crawl page and extract internal links
          const result = await crawlLinks(source.value);
          if (result.error) {
            errors.push(`Link crawl error (${source.value}): ${result.error}`);
            continue;
          }
          urls = result.links;
        } else {
          // Manual source — skip crawling
          continue;
        }

        // Save new URLs to database
        for (const url of urls) {
          discoveredCount++;
          if (!existingUrls.has(url)) {
            try {
              if (!shouldIndexCrawledUrl(url, competitor.crawlRules)) {
                continue;
              }

              const rawHtml = await fetchPageSourceCode(url);
              const visibleHtml = extractVisibleHtml(rawHtml);
              await upsertCompetitorPage({
                competitorId,
                title: new URL(url).pathname.split('/').filter(Boolean).join(' / ') || 'Listing',
                source: url,
                visibleHtml,
                lastLoggedStatus: null,
                lastLoggedOn: new Date(),
              });
              savedCount++;
              existingUrls.add(url);
            } catch (e) {
              const status = getHttpStatusFromError(e);
              if (status) {
                await upsertCompetitorPage({
                  competitorId,
                  title: new URL(url).pathname.split('/').filter(Boolean).join(' / ') || 'Listing',
                  source: url,
                  visibleHtml: null,
                  lastLoggedStatus: status,
                  lastLoggedOn: new Date(),
                });
                savedCount++;
                existingUrls.add(url);
                continue;
              }

              errors.push(`Failed to save URL ${url}: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
          }
        }
      } catch (e) {
        errors.push(`Failed to process source ${source.value}: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    revalidatePath('/manage/intelligence/logs');

    return {
      success: true,
      discoveredCount,
      savedCount,
      errors,
    };
  } catch (e) {
    await logProblem(e, `crawlCompetitorSourcesAction (${competitorId})`);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error occurred',
    };
  }
}
