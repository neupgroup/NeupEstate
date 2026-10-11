
'use server';

import { prisma } from '@neup/core/database/prisma';
import type { Sitemap, SitemapLog } from '@/types';
import { extractAndSaveProperty as extractAndSavePropertyFlow } from '@/services/intelligence/extract-property-details-flow';
import { logger } from '@neup/logica/logger';
import { crawlSitemap } from '@/services/crawl/sitemap-crawl';

export async function addSitemap(url: string): Promise<string> {
    const existing = await prisma.sitemapEntry.findUnique({
        where: { url },
        select: { id: true },
    });

    if (existing) {
        throw new Error('This sitemap URL is already being tracked.');
    }

    const sitemap = await prisma.sitemapEntry.create({
        data: { url },
        select: { id: true },
    });

    return sitemap.id;
}

export async function getSitemaps(): Promise<Sitemap[]> {
    try {
        const rows = await prisma.sitemapEntry.findMany({
            orderBy: { updatedAt: 'desc' },
        });

        return rows.map((row) => ({
            id: row.id,
            url: row.url,
            lastChecked: row.lastmod?.toISOString(),
        }));
    } catch (error) {
        await logger().type('getSitemaps').data({ error: String(error), details: {} }).log();
        return [];
    }
}

export async function getNewUrlsFromSitemap(sitemapId: string): Promise<{ sitemapUrl: string, newUrls: string[], logs: SitemapLog[] }> {
    const logs: SitemapLog[] = [];

    const sitemap = await prisma.sitemapEntry.findUnique({
        where: { id: sitemapId },
        select: { url: true },
    });

    if (!sitemap) {
        throw new Error('Sitemap not found.');
    }

    const sitemapUrl = sitemap.url;

    logs.push({ status: 'info', message: `Accessing sitemap: ${sitemapUrl}` });

    try {
        const result = await crawlSitemap(sitemapUrl);
        if (result.error) {
            throw new Error(result.error);
        }
        logs.push({ status: 'info', message: `Found ${result.urls.length} URLs in the sitemap.` });
        logs.push({ status: 'info', message: `${result.urls.length} URLs will be processed.` });
        return { sitemapUrl, newUrls: result.urls, logs };
    } catch (error: unknown) {
        const errorMessage = `Failed to parse sitemap XML: ${error instanceof Error ? error.message : String(error)}`;
        logs.push({ status: 'error', message: errorMessage });
        return { sitemapUrl, newUrls: [], logs };
    }
}

export async function processSitemapUrl(url: string): Promise<SitemapLog> {
    try {
        const result = await extractAndSavePropertyFlow({ url, saveToDb: true });
        if (result.propertyId && !result.error) {
            return {
                status: 'success',
                message: `Imported property from ${url} with ID: ${result.propertyId}`,
                propertyId: result.propertyId,
                rawHtml: result.rawHtml,
                updatedData: result.extractedData,
            };
        } else {
             const reason = result.error || 'Not a property page.';
             return {
                status: 'skipped',
                message: `Skipped URL ${url}. Reason: ${reason}`,
                rawHtml: result.rawHtml,
                updatedData: result.extractedData,
            };
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { status: 'error', message: `Failed to process URL ${url}. Error: ${errorMessage}` };
    }
}

export async function updateSitemapCheckedTime(sitemapId: string): Promise<void> {
    await prisma.sitemapEntry.update({
        where: { id: sitemapId },
        data: { lastmod: new Date() },
    });
}
