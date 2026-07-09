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
import { shouldIndexCrawledUrl } from '@/services/crawl/crawl-rules';
import { extractIntelligencePage } from '@/services/ai/extract-intelligence-page-flow';
import { extractCompetitorListing } from '@/services/ai/extract-competitor-listing-flow';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/core/database/prisma';
import { upsertCompetitorListing } from '@/services/competitor-service';

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

function getFriendlyAiError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('Too Many Requests') ||
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('429')
  ) {
    return 'AI quota exceeded. Please try again later.';
  }

  return message || 'Failed to extract listing.';
}

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

export async function updateCompetitorCrawlRulesAction(
  competitorId: string,
  rules: string[],
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$executeRaw`
      UPDATE "competitors"
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
