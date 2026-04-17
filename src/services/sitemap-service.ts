
// src/services/sitemap-service.ts
'use server';

import { getFirestore } from '@/lib/firebase';
import { prisma } from '@/lib/prisma';
import type { Sitemap, SitemapLog } from '@/types';
import * as cheerio from 'cheerio';
import { extractAndSaveProperty as extractAndSavePropertyFlow } from '@/services/ai/extract-property-details-flow';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';

export async function addSitemap(url: string): Promise<string> {
    const firestore = getFirestore();

    if (firestore) {
        const existing = await firestore.collection('sitemaps').where('url', '==', url).limit(1).get();
        if (!existing.empty) {
            throw new Error('This sitemap URL is already being tracked.');
        }

        const docRef = await firestore.collection('sitemaps').add({
            url,
            lastChecked: null,
        });
        return docRef.id;
    }

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
    const firestore = getFirestore();

    try {
        if (!firestore) {
            const rows = await prisma.sitemapEntry.findMany({
                orderBy: { updatedAt: 'desc' },
            });

            return rows.map((row) => ({
                id: row.id,
                url: row.url,
                lastChecked: row.lastmod?.toISOString(),
            }));
        }

        const snapshot = await firestore.collection('sitemaps').get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            const lastCheckedTimestamp = data.lastChecked;
            let lastChecked: string | undefined = undefined;

            // Defensively check if it's a Firestore Timestamp object before converting
            if (lastCheckedTimestamp && typeof lastCheckedTimestamp.toDate === 'function') {
                lastChecked = lastCheckedTimestamp.toDate().toISOString();
            }
            
            return {
                id: doc.id,
                url: data.url,
                lastChecked,
            };
        });
    } catch (error) {
        console.error("Error fetching sitemaps:", error);
        // It's crucial to log the error but still return a valid (empty) array
        // to prevent the server action from crashing.
        return [];
    }
}

async function getExistingSourceUrls(): Promise<Set<string>> {
    const firestore = getFirestore();

    if (firestore) {
        const snapshot = await firestore.collection('properties').where('sourceUrl', '!=', null).get();
        const urls = snapshot.docs.map(doc => doc.data().sourceUrl);
        return new Set(urls);
    }

    const hasSourceUrlColumn = await prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'properties'
              AND column_name = 'sourceUrl'
        ) AS exists
    `;

    if (!hasSourceUrlColumn[0]?.exists) {
        return new Set();
    }

    const rows = await prisma.$queryRaw<Array<{ sourceUrl: string | null }>>`
        SELECT "sourceUrl"
        FROM properties
        WHERE "sourceUrl" IS NOT NULL
    `;

    return new Set(rows.map((row) => row.sourceUrl).filter((url): url is string => Boolean(url)));
}

export async function getNewUrlsFromSitemap(sitemapId: string): Promise<{ sitemapUrl: string, newUrls: string[], logs: SitemapLog[] }> {
    const firestore = getFirestore();
    const logs: SitemapLog[] = [];

    let sitemapUrl: string;
    if (firestore) {
        const sitemapRef = await firestore.collection('sitemaps').doc(sitemapId).get();
        if (!sitemapRef.exists) {
            throw new Error('Sitemap not found.');
        }
        sitemapUrl = (sitemapRef.data() as Omit<Sitemap, 'id'>).url;
    } else {
        const sitemap = await prisma.sitemapEntry.findUnique({
            where: { id: sitemapId },
            select: { url: true },
        });

        if (!sitemap) {
            throw new Error('Sitemap not found.');
        }

        sitemapUrl = sitemap.url;
    }

    logs.push({ status: 'info', message: `Accessing sitemap: ${sitemapUrl}` });

    try {
        const xml = await fetchPageSourceCode(sitemapUrl);
        const $ = cheerio.load(xml, { xmlMode: true, decodeEntities: false });
        
        const sitemapUrls = $('url > loc').map((i, el) => $(el).text()).get();
        logs.push({ status: 'info', message: `Found ${sitemapUrls.length} URLs in the sitemap.` });

        if (sitemapUrls.length > 0) {
            const existingUrls = await getExistingSourceUrls();
            if (!firestore && existingUrls.size === 0) {
                logs.push({
                    status: 'info',
                    message: 'Duplicate filtering is unavailable in the current Postgres schema because properties.sourceUrl is missing. Treating all sitemap URLs as new.',
                });
            }
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
        const result = await extractAndSavePropertyFlow({ url });
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
    const firestore = getFirestore();

    if (firestore) {
        await firestore.collection('sitemaps').doc(sitemapId).update({ lastChecked: new Date() });
        return;
    }

    await prisma.sitemapEntry.update({
        where: { id: sitemapId },
        data: { lastmod: new Date() },
    });
}
