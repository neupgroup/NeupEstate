'use server';

import * as cheerio from 'cheerio';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';

export type SitemapCrawlResult = {
  url: string;
  urls: string[];
  error?: string;
};

/**
 * Fetches a sitemap URL and returns all <loc> entries found within it.
 * Handles both standard sitemaps and sitemap index files.
 */
export async function crawlSitemap(sitemapUrl: string): Promise<SitemapCrawlResult> {
  try {
    const xml = await fetchPageSourceCode(sitemapUrl);
    const $ = cheerio.load(xml, { xmlMode: true, decodeEntities: false });

    // Sitemap index — recurse into each child sitemap
    const childSitemaps = $('sitemapindex > sitemap > loc').map((_, el) => $(el).text().trim()).get();
    if (childSitemaps.length > 0) {
      const nested = await Promise.all(childSitemaps.map((u) => crawlSitemap(u)));
      const allUrls = nested.flatMap((r) => r.urls);
      return { url: sitemapUrl, urls: [...new Set(allUrls)] };
    }

    // Standard sitemap
    const urls = $('url > loc').map((_, el) => $(el).text().trim()).get();
    return { url: sitemapUrl, urls: [...new Set(urls)] };
  } catch (e: any) {
    return { url: sitemapUrl, urls: [], error: e.message };
  }
}
