/**
 * ::neup.documentation::manage-intelligence-logs-page
 *
 * Management page for reviewing crawled competitor pages and starting the crawl pipeline.
 *
 * ::public
 *
 * This page shows crawled competitor pages inside the intelligence area.
 *
 * Main responsibilities:
 * - enforce the intelligence listings permission
 * - show the crawl pipeline entry card and start action
 * - list crawled competitor pages with listing status indicators
 * - paginate the result set for easier review
 *
 * User-facing behavior:
 * - pages that already produced a competitor listing are marked as complete
 * - pages flagged as `not_to_log` are shown with a neutral status
 * - unprocessed or failed pages remain highlighted as needing attention
 *
 * ::public end
 *
 * ::private
 *
 * The page reads from `competitor_pages` and left-joins `competitor_listings`
 * so status can be derived without extra per-row queries.
 *
 * The top pipeline card is intentionally action-oriented: it explains the crawl,
 * render, capture, image collection, storage, and AI conversion pipeline in one
 * place and delegates execution to `StartCrawlButton`.
 *
 * Pagination is performed in memory after the raw query result is returned.
 * That is acceptable for the current admin-style review surface but may need to
 * move into SQL if the crawl log volume grows substantially.
 *
 * ::private end
 * ::end
 */
import { prisma } from '@/logica/core/prisma';
import { ClientLink } from '@/components/client-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks } from 'lucide-react';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { Pagination } from '@/components/manage/pagination';
import { StartCrawlButton } from './start-crawl-button';

function getStatusDotColor(listing: { id: string } | null | undefined, lastLoggedStatus: string | null) {
  if (listing) return 'bg-emerald-500';
  if (lastLoggedStatus === 'not_to_log') return 'bg-slate-400';
  return 'bg-red-500';
}

export default async function ListingsIntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const listings = await prisma.$queryRaw<Array<any>>`
    SELECT
      p.*,
      l.id AS "listingId"
    FROM "competitor_pages" p
    LEFT JOIN "competitor_listings" l ON l."competitorPageId" = p.id
    ORDER BY p."createdAt" DESC
  `;
  const resolvedSearchParams = await searchParams;
  const pageParam = Array.isArray(resolvedSearchParams?.page)
    ? resolvedSearchParams.page[0]
    : (resolvedSearchParams?.page as string | undefined);
  const currentPage = Math.max(1, Number(pageParam ?? '1'));
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(listings.length / pageSize));
  const start = (currentPage - 1) * pageSize;
  const currentListings = listings.slice(start, start + pageSize);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ListChecks className="h-6 w-6" />
          Intelligence Listings
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Directly view logged listing pages from crawled sources.
        </p>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit">Pipeline</Badge>
              <CardTitle className="text-xl">Crawl and fetch properties</CardTitle>
              <CardDescription className="max-w-3xl break-words">
                Crawl the site, fetch the rendered HTML, capture the source HTML, collect the images, save the rendered HTML in the database, and then pass the page to AI to create a competitor listing.
              </CardDescription>
            </div>
            <StartCrawlButton />
          </div>
        </CardHeader>
      </Card>

      {listings.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No listings found yet. Add sources in{' '}
          <ClientLink href="/manage/intelligence/competition" className="text-primary underline">
            Competition
          </ClientLink>
          .
        </p>
      )}

      <div className="space-y-0">
        {currentListings.map((listing) => (
          <Card
            key={listing.id}
            className="w-full overflow-hidden rounded-none border-t-0 first:rounded-t-lg first:border-t last:rounded-b-lg hover:border-primary transition-colors"
          >
            <CardHeader className="min-w-0 pb-2">
              <CardTitle className="flex w-full items-start gap-2 text-base min-w-0">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${getStatusDotColor(listing.listingId ? { id: listing.listingId } : null, listing.lastLoggedStatus)}`} aria-hidden="true" />
                <a href={listing.source} target="_blank" rel="noreferrer" className="block min-w-0 flex-1 whitespace-normal break-all leading-snug hover:underline">
                  {listing.title}
                </a>
              </CardTitle>
              <CardDescription className="min-w-0 whitespace-normal break-all">
                {listing.source}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex w-full items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {listing.listedOn ? new Date(listing.listedOn).toLocaleDateString() : new Date(listing.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination totalPages={totalPages} currentPage={currentPage} />
      )}
    </div>
  );
}
