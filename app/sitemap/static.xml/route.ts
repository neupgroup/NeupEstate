const PUBLIC_BASE_URL = 'https://neupgroup.com/estate';

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET(request: Request) {
  const paths = [
    '/',
    '/accounts',
    '/agencies',
    '/agents',
    '/agents/register',
    '/collections',
    '/documents',
    '/mortgage/request',
    '/requests/create',
    '/search',
    '/sell',
    '/tools/emi-calculator',
    '/tools/unit-converter',
  ];
  const body = paths.map((path) => `  <url><loc>${xmlEscape(`${PUBLIC_BASE_URL}${path}`)}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
