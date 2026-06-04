import { prisma } from '@/logica/core/prisma';
import { ClientLink } from '@/components/client-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { Pagination } from '@/components/manage/pagination';

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
