
'use server';

import { prisma } from '@/core/database/prisma';
import type { Sitemap, SitemapLog } from '@/types';
import * as cheerio from 'cheerio';
import { extractAndSaveProperty as extractAndSavePropertyFlow } from '@/services/ai/extract-property-details-flow';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';

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
        console.error("Error fetching sitemaps:", error);
        // It's crucial to log the error but still return a valid (empty) array
        // to prevent the server action from crashing.
        return [];
    }
}

async function getExistingSourceUrls(): Promise<Set<string>> {
    return new Set();
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
        const xml = await fetchPageSourceCode(sitemapUrl);
        const $ = cheerio.load(xml, { xmlMode: true, decodeEntities: false });
        
        const sitemapUrls = $('url > loc').map((i, el) => $(el).text()).get();
        logs.push({ status: 'info', message: `Found ${sitemapUrls.length} URLs in the sitemap.` });

        if (sitemapUrls.length > 0) {
            const existingUrls = await getExistingSourceUrls();
            const newUrlsToImport = sitemapUrls.filter(url => !existingUrls.has(url));
            logs.push({ status: 'info', message: `${newUrlsToImport.length} of them are new and will be processed.` });
            return { sitemapUrl, newUrls: newUrlsToImport, logs };
        }
        return { sitemapUrl, newUrls: [], logs };
    } catch (error: any) {
        const errorMessage = `Failed to parse sitemap XML: ${error.message}`;
        logs.push({ status: 'error', message: errorMessage });
        // Still return, but with empty URLs and the error log
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
    } catch (e: any) {
        const errorMessage = e.message || e;
        return { status: 'error', message: `Failed to process URL ${url}. Error: ${errorMessage}` };
    }
}

export async function updateSitemapCheckedTime(sitemapId: string): Promise<void> {
    await prisma.sitemapEntry.update({
        where: { id: sitemapId },
        data: { lastmod: new Date() },
    });
}
