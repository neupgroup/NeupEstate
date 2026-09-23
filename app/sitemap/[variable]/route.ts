import { prisma } from '@neup/core/database/prisma';

const PUBLIC_BASE_URL = 'https://neupgroup.com/estate';
const PAGE_SIZE = 50_000;

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function sitemapResponse(urls: string[]): Response {
  const body = urls.map((url) => `  <url><loc>${xmlEscape(url)}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}

async function propertySitemap(page: number): Promise<Response> {
  const rows = await prisma.property.findMany({
    where: { isApproved: true, isDeleted: false },
    select: { slug: true },
    orderBy: { id: 'asc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  return sitemapResponse(rows.map(({ slug }) => `${PUBLIC_BASE_URL}/properties/${encodeURIComponent(slug)}`));
}

async function agentSitemap(page: number): Promise<Response> {
  const rows = await prisma.account.findMany({
    where: { accountType: 'individual.agent' },
    select: { neupId: true, id: true },
    orderBy: { id: 'asc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  return sitemapResponse(rows.map(({ neupId, id }) => `${PUBLIC_BASE_URL}/agents/${encodeURIComponent(neupId || id)}`));
}

async function agencySitemap(page: number): Promise<Response> {
  const rows = await prisma.account.findMany({
    where: { accountType: { in: ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'] } },
    select: { neupId: true },
    orderBy: { id: 'asc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  return sitemapResponse(rows.flatMap(({ neupId }) => neupId ? [`${PUBLIC_BASE_URL}/@${encodeURIComponent(neupId)}`] : []));
}

export async function GET(request: Request, { params }: { params: Promise<{ variable: string }> }) {
  const variable = (await params).variable;
  const match = /^(properties|agents|agencies)-(\d+)\.xml$/.exec(variable);
  if (!match) return new Response('Not found', { status: 404 });

  const [, type, countText] = match;
  const page = Number(countText);
  if (!Number.isSafeInteger(page) || page < 1) return new Response('Not found', { status: 404 });

  if (type === 'properties') return propertySitemap(page);
  if (type === 'agents') return agentSitemap(page);
  return agencySitemap(page);
}
