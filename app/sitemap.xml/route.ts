import { prisma } from '@neup/core/database/prisma';
const PUBLIC_BASE_URL = 'https://neupgroup.com/estate';

const PAGE_SIZE = 50_000;

// XmlEscape for this route.
function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Handle the GET request and return the requested resource.
export async function GET(request: Request) {
  const listingCount = await prisma.listing.count({ where: { isApproved: true, isDeleted: false } });

  // Divide the listing count into sitemap-sized groups and keep one group for empty sites.
  const listingSitemaps = Array.from({ length: Math.max(1, Math.ceil(listingCount / PAGE_SIZE)) }, (_, i) => `/sitemap/listings-${i + 1}.xml`);

  const entries = [
    '/sitemap/static.xml',
    ...listingSitemaps,
    '/sitemap/agents-01.xml',
    '/sitemap/agencies-01.xml',
  ];

  const body = entries.map((path) => `  <sitemap><loc>${xmlEscape(`${PUBLIC_BASE_URL}${path}`)}</loc></sitemap>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
