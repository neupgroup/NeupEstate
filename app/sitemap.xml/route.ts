import { prisma } from '@neup/core/database/prisma';
const PUBLIC_BASE_URL = 'https://neupgroup.com/estate';

const PAGE_SIZE = 50_000;

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET(request: Request) {
  const propertyCount = await prisma.property.count({ where: { isApproved: true, isDeleted: false } });

  const propertySitemaps = Array.from({ length: Math.max(1, Math.ceil(propertyCount / PAGE_SIZE)) }, (_, i) => `/sitemap/properties-${i + 1}.xml`);

  const entries = [
    '/sitemap/static.xml',
    ...propertySitemaps,
    '/sitemap/agents-01.xml',
    '/sitemap/agencies-01.xml',
  ];

  const body = entries.map((path) => `  <sitemap><loc>${xmlEscape(`${PUBLIC_BASE_URL}${path}`)}</loc></sitemap>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
