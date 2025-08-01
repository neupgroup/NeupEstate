
// src/services/sitemap-service.ts
'use server';

import { getFirestore } from '@/lib/firebase';
import type { Sitemap, SitemapLog } from '@/types';
import * as cheerio from 'cheerio';
import { extractAndSaveProperty as extractAndSavePropertyFlow } from '@/services/ai/extract-property-details-flow';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';

export async function addSitemap(url: string): Promise<string> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore is not available.');
    
    // Check if sitemap with this URL already exists
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

export async function getSitemaps(): Promise<Sitemap[]> {
    const firestore = getFirestore();
    if (!firestore) return [];
    try {
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
    if (!firestore) return new Set();
    const snapshot = await firestore.collection('properties').where('sourceUrl', '!=', null).get();
    const urls = snapshot.docs.map(doc => doc.data().sourceUrl);
    return new Set(urls);
}

export async function getNewUrlsFromSitemap(sitemapId: string): Promise<{ sitemapUrl: string, newUrls: string[], logs: SitemapLog[] }> {
    const firestore = getFirestore();
    if (!firestore) throw new Error('Firestore is not available.');
    
    const logs: SitemapLog[] = [];

    const sitemapRef = await firestore.collection('sitemaps').doc(sitemapId).get();
    if (!sitemapRef.exists) {
        throw new Error('Sitemap not found.');
    }
    const sitemap = sitemapRef.data() as Omit<Sitemap, 'id'>;
    
    logs.push({ status: 'info', message: `Accessing sitemap: ${sitemap.url}` });

    try {
        const xml = await fetchPageSourceCode(sitemap.url);
        const $ = cheerio.load(xml, { xmlMode: true, decodeEntities: false });
        
        const sitemapUrls = $('url > loc').map((i, el) => $(el).text()).get();
        logs.push({ status: 'info', message: `Found ${sitemapUrls.length} URLs in the sitemap.` });

        if (sitemapUrls.length > 0) {
            const existingUrls = await getExistingSourceUrls();
            const newUrlsToImport = sitemapUrls.filter(url => !existingUrls.has(url));
            logs.push({ status: 'info', message: `${newUrlsToImport.length} of them are new and will be processed.` });
            return { sitemapUrl: sitemap.url, newUrls: newUrlsToImport, logs };
        }
        return { sitemapUrl: sitemap.url, newUrls: [], logs };
    } catch (error: any) {
        const errorMessage = `Failed to parse sitemap XML: ${error.message}`;
        logs.push({ status: 'error', message: errorMessage });
        // Still return, but with empty URLs and the error log
        return { sitemapUrl: sitemap.url, newUrls: [], logs };
    }
}

export async function processSitemapUrl(url: string): Promise<SitemapLog> {
    try {
        const result = await extractAndSavePropertyFlow({ url });
        if (result.propertyId && !result.error) {
            return { 
                status: 'success', 
                message: `Imported property from ${url} with ID: ${result.propertyId}`,
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
    if (!firestore) throw new Error('Firestore is not available.');
    await firestore.collection('sitemaps').doc(sitemapId).update({ lastChecked: new Date() });
}
