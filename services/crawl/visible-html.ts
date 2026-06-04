import * as cheerio from 'cheerio';

export function extractVisibleHtml(rawHtml: string): string {
  const $ = cheerio.load(rawHtml);

  $('script, style, noscript, template').remove();
  $('meta, link, iframe, svg, canvas').remove();

  const bodyHtml = $('body').html()?.trim();
  return bodyHtml && bodyHtml.length > 0 ? bodyHtml : $.root().html() ?? '';
}
