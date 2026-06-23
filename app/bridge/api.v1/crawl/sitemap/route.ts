import { NextRequest, NextResponse } from 'next/server';
import { crawlSitemap } from '@/services/crawl/sitemap';
import { withRequestDevLog } from '@/services/site-dev-log-service';

const getHandler = async (request: NextRequest) => {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url parameter.' }, { status: 400 });

  const result = await crawlSitemap(url);
  return NextResponse.json(result);
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/crawl/sitemap' }, getHandler);
