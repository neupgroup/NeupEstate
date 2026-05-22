import { NextRequest, NextResponse } from 'next/server';
import { crawlLinks } from '@/services/crawl/links';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url parameter.' }, { status: 400 });

  const result = await crawlLinks(url);
  return NextResponse.json(result);
}
