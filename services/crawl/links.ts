'use server';

import * as cheerio from 'cheerio';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';

export type LinksCrawlResult = {
  url: string;
  links: string[];
  error?: string;
};

/**
 * Fetches a page and extracts all unique internal links (same origin).
 * External links and anchors are excluded.
 */
export async function crawlLinks(pageUrl: string): Promise<LinksCrawlResult> {
  try {
    const html = await fetchPageSourceCode(pageUrl);
    const $ = cheerio.load(html);
    const origin = new URL(pageUrl).origin;

    const links = new Set<string>();

    $('a[href]').each((_, el) => {
      const raw = $(el).attr('href')?.trim();
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return;

      try {
        const resolved = new URL(raw, pageUrl);
        if (resolved.origin === origin) {
          resolved.hash = '';
          links.add(resolved.href);
        }
      } catch {
        // ignore unparseable hrefs
      }
    });

    return { url: pageUrl, links: [...links] };
  } catch (e: any) {
    return { url: pageUrl, links: [], error: e.message };
  }
}
