import { NextRequest, NextResponse } from 'next/server';
import { crawlLinks } from '@/services/crawl/links';

const getHandler = async (request: NextRequest) => {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url parameter.' }, { status: 400 });

  const result = await crawlLinks(url);
  return NextResponse.json(result);
};

export const GET = getHandler;
