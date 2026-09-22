'use server';

import * as cheerio from 'cheerio';
import { logProblem } from '@/services/problem-service';
import { fetchPageSourceCode } from './fetch-page-source';

export async function fetchAllImageUrlsFromPage(url: string): Promise<string[]> {
    try {
        const html = await fetchPageSourceCode(url);
        const $ = cheerio.load(html);
        const images = new Set<string>();

        $('body img').each((_, element) => {
            const src = $(element).attr('src');
            if (!src) return;

            try {
                images.add(new URL(src, url).href);
            } catch {
                // Ignore malformed and data URLs.
            }
        });

        return Array.from(images);
    } catch (error) {
        await logProblem(error, `fetchAllImageUrlsFromPage (URL: ${url})`);
        throw error;
    }
}
