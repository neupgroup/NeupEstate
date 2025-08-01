
'use server';

import * as cheerio from 'cheerio';
import { logProblem } from '../problem-service';
import { fetchPageSourceCode } from './fetch-page-source2';

/**
 * Fetches a page's HTML, scrapes all image `src` attributes from the body,
 * and resolves them to absolute URLs.
 * @param url The URL of the page to scrape.
 * @returns A promise that resolves to an array of absolute image URLs.
 */
export async function fetchAllImageUrlsFromPage(url: string): Promise<string[]> {
    try {
        const html = await fetchPageSourceCode(url);
        const $ = cheerio.load(html);
        const images: Set<string> = new Set();
        
        $('body img').each((_, el) => {
            const src = $(el).attr('src');
            if (src) {
                try {
                    const absoluteUrl = new URL(src, url).href;
                    images.add(absoluteUrl);
                } catch (e) {
                    // This can happen with malformed src attributes, e.g., "data:image/..."
                    // We can safely ignore these for now.
                }
            }
        });
    
        return Array.from(images);
    } catch (error) {
        await logProblem(error, `fetchAllImageUrlsFromPage (URL: ${url})`);
        // Re-throw the error so the calling action can handle it.
        throw error;
    }
}
