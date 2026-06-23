import { NextRequest, NextResponse } from 'next/server';
import { crawlLinks } from '@/services/crawl/links';
import { withRequestDevLog } from '@/services/site-dev-log-service';

const getHandler = async (request: NextRequest) => {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url parameter.' }, { status: 400 });

  const result = await crawlLinks(url);
  return NextResponse.json(result);
};

export const GET = withRequestDevLog({ source: 'api', name: 'bridge/api.v1/crawl/links' }, getHandler);
