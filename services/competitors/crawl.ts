'use server';

import { getCompetitorById, getCompetitorPages, upsertCompetitorPage, upsertCompetitorListing } from './service';
import { crawlSitemap } from '@/services/crawl/sitemap-crawl';
import { crawlLinks } from '@/services/crawl/links';
import { fetchPageSourceCode } from '@/services/crawl/fetch-page-source';
import { extractVisibleHtml } from '@/services/crawl/visible-html';
import { shouldIndexCrawledUrl } from '@/services/crawl/crawl-rules';
import { extractIntelligencePage } from '@/services/intelligence/extract-intelligence-page-flow';
import { extractCompetitorListing } from '@/services/intelligence/extract-competitor-listing-flow';
import { revalidatePath } from 'next/cache';
import { buildDefaultTitle, getFriendlyAiError, getHttpStatusFromError, isLoggedStatus } from './crawl/_helpers';

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
          urls = result.urls.filter((url) => shouldIndexCrawledUrl(url, competitor.crawlRules));
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
          urls = result.links.filter((url) => shouldIndexCrawledUrl(url, competitor.crawlRules));
        }

        crawledCount += urls.length;

        for (const url of urls) {
          discoveredCount += 1;
          const existingPage = existingPages.find((page) => page.source === url);
          let pageId = existingPage?.id ?? null;
          let visibleHtml = '';

          if (existingPage && isLoggedStatus(existingPage.lastLoggedStatus)) {
            continue;
          }

          try {
            const rawHtml = await fetchPageSourceCode(url);
            visibleHtml = extractVisibleHtml(rawHtml);

            if (!shouldIndexCrawledUrl(url, competitor.crawlRules)) {
              pageId = await upsertCompetitorPage({
                competitorId,
                title: buildDefaultTitle(url, existingPage?.title),
                description: existingPage?.description ?? undefined,
                source: url,
                visibleHtml: visibleHtml,
                lastLoggedStatus: 'not_to_log',
                lastLoggedOn: new Date(),
                details: existingPage?.details ?? undefined,
                listedOn: existingPage?.listedOn ? new Date(existingPage.listedOn) : undefined,
              });
              existingUrls.add(url);
              continue;
            }

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

            pageId = await upsertCompetitorPage({
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

            try {
              const listingResult = await extractCompetitorListing({ url });
              if (listingResult.isPropertyPage && pageId) {
                await upsertCompetitorListing({
                  competitorId,
                  competitorPageId: pageId,
                  title: listingResult.title?.trim() || aiResult.title?.trim() || buildDefaultTitle(url, existingPage?.title),
                  description: listingResult.description?.trim() || aiResult.description?.trim() || existingPage?.description || undefined,
                  purpose: listingResult.purpose ?? aiResult.purpose ?? 'sales',
                  agentName: listingResult.agentName,
                  price: listingResult.price ?? aiResult.price ?? null,
                  priceBasis: listingResult.priceBasis,
                  isSold: listingResult.isSold ?? false,
                  details: listingResult.details ?? undefined,
                });
                revalidatePath('/manage/intelligence/listings');
              }
            } catch (error) {
              errors.push(`${url}: ${getFriendlyAiError(error)}`);
            }
            savedCount += 1;
            existingUrls.add(url);
          } catch (error) {
            const status = getHttpStatusFromError(error);
            if (status) {
              pageId = await upsertCompetitorPage({
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
              savedCount += 1;
              existingUrls.add(url);
              continue;
            }

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
