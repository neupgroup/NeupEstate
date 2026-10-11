import * as cheerio from 'cheerio';
import { fetchPageSourceCode } from '@/services/crawl/fetch-page-source';

export type SitemapCrawlResult = {
  url: string;
  urls: string[];
  error?: string;
};

/** Fetches a sitemap URL and returns all <loc> entries, including sitemap indexes. */
export async function crawlSitemap(sitemapUrl: string): Promise<SitemapCrawlResult> {
  try {
    const xml = await fetchPageSourceCode(sitemapUrl);
    const $ = cheerio.load(xml, { xmlMode: true, decodeEntities: false });

    const childSitemaps = $('sitemapindex > sitemap > loc')
      .map((_, element) => $(element).text().trim())
      .get();

    if (childSitemaps.length > 0) {
      const nested = await Promise.all(childSitemaps.map((url) => crawlSitemap(url)));
      return {
        url: sitemapUrl,
        urls: [...new Set(nested.flatMap((result) => result.urls))],
      };
    }

    const urls = $('url > loc').map((_, element) => $(element).text().trim()).get();
    return { url: sitemapUrl, urls: [...new Set(urls)] };
  } catch (error) {
    return {
      url: sitemapUrl,
      urls: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
