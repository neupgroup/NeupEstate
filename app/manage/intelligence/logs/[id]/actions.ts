'use server';

import { crawlSitemap } from '@/services/crawl/sitemap';
import { crawlLinks } from '@/services/crawl/links';
import { getCompetitorById, getCompetitorPages, upsertCompetitorPage } from '@/services/competitor-service';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';
import { extractVisibleHtml } from '@/services/crawl/visible-html';
import { shouldIndexCrawledUrl } from '@/services/crawl/crawl-rules';
import { extractIntelligencePage } from '@/services/ai/extract-intelligence-page-flow';
import { logProblem } from '@/services/problem-service';
import { revalidatePath } from 'next/cache';

function getHttpStatusFromError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/status:\s*(\d{3})/i);
  return match ? match[1] : null;
}

function isLoggedStatus(status: string | null | undefined): boolean {
  return status === 'logged';
}

function buildDefaultTitle(url: string, title?: string | null): string {
  return title?.trim() || new URL(url).pathname.split('/').filter(Boolean).join(' / ') || 'Listing';
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
          const existingPage = existingProperties.find((page) => page.source === url);

          if (existingPage && isLoggedStatus(existingPage.lastLoggedStatus)) {
            continue;
          }

          try {
            if (!shouldIndexCrawledUrl(url, competitor.crawlRules)) {
            await upsertCompetitorPage({
                competitorId,
                title: buildDefaultTitle(url, existingPage?.title),
                description: existingPage?.description ?? undefined,
                source: url,
                visibleHtml,
                lastLoggedStatus: 'not_to_log',
                lastLoggedOn: new Date(),
                details: existingPage?.details ?? undefined,
                listedOn: existingPage?.listedOn ? new Date(existingPage.listedOn) : undefined,
              });
              existingUrls.add(url);
              continue;
            }

            const rawHtml = await fetchPageSourceCode(url);
            const visibleHtml = extractVisibleHtml(rawHtml);
            const aiResult = await extractIntelligencePage({ url, htmlContent: visibleHtml });

            if (!aiResult.success) {
              await upsertCompetitorPage({
                competitorId,
                title: buildDefaultTitle(url, existingPage?.title),
                description: existingPage?.description ?? undefined,
                source: url,
                lastLoggedStatus: 'not_logged',
                lastLoggedOn: new Date(),
                details: { reason: aiResult.reason ?? 'AI classified this page as not a property page.' },
                listedOn: existingPage?.listedOn ? new Date(existingPage.listedOn) : undefined,
              });
              errors.push(`${url}: ${aiResult.reason ?? 'The page has not been logged.'}`);
              continue;
            }

            await upsertCompetitorPage({
              competitorId,
              title: aiResult.title?.trim() || buildDefaultTitle(url, existingPage?.title),
              description: aiResult.description?.trim() || existingPage?.description || undefined,
              source: url,
              visibleHtml,
              lastLoggedStatus: 'logged',
              lastLoggedOn: new Date(),
              details: {
                price: aiResult.price,
                location: aiResult.location,
                bedrooms: aiResult.bedrooms,
                bathrooms: aiResult.bathrooms,
                area: aiResult.area,
                purpose: aiResult.purpose,
                category: aiResult.category,
                type: aiResult.type,
                amenities: aiResult.amenities,
                images: aiResult.images,
                listingAgent: aiResult.listingAgent,
                isOwnerListing: aiResult.isOwnerListing,
                floors: aiResult.floors,
                roadAccess: aiResult.roadAccess,
              },
              listedOn: existingPage?.listedOn ? new Date(existingPage.listedOn) : new Date(),
            });
            savedCount++;
            existingUrls.add(url);
          } catch (e) {
            const status = getHttpStatusFromError(e);
            if (status) {
              await upsertCompetitorPage({
                competitorId,
                title: buildDefaultTitle(url, existingPage?.title),
                description: existingPage?.description ?? undefined,
                source: url,
                visibleHtml,
                lastLoggedStatus: status,
                lastLoggedOn: new Date(),
                details: existingPage?.details ?? undefined,
                listedOn: existingPage?.listedOn ? new Date(existingPage.listedOn) : undefined,
              });
              existingUrls.add(url);
              continue;
            }

            errors.push(`Failed to save URL ${url}: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
