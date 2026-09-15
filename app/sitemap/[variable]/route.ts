import { agencySitemap, agentSitemap, propertySitemap } from '@/services/public-sitemap';

export async function GET(request: Request, { params }: { params: Promise<{ variable: string }> }) {
  const variable = (await params).variable;
  const match = /^(properties|agents|agencies)-(\d+)\.xml$/.exec(variable);
  if (!match) return new Response('Not found', { status: 404 });

  const [, type, countText] = match;
  const page = Number(countText);
  if (!Number.isSafeInteger(page) || page < 1) return new Response('Not found', { status: 404 });

  if (type === 'properties') return propertySitemap(request, page);
  if (type === 'agents') return agentSitemap(request, page);
  return agencySitemap(request, page);
}
