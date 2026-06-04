import { prisma } from '@/logica/core/prisma';
import { ClientLink } from '@/components/client-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Link2 } from 'lucide-react';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { Pagination } from '@/components/manage/pagination';

export default async function ListingsIntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const listings = await prisma.$queryRaw<Array<any>>`
    SELECT
      l.*,
      p.id AS "sourcePageId",
      p.title AS "sourceTitle",
      p.source AS "sourceUrl",
      p."lastLoggedStatus" AS "sourceLastLoggedStatus",
      p."lastLoggedOn" AS "sourceLastLoggedOn",
      p."listedOn" AS "sourceListedOn"
    FROM "competitor_listings" l
    LEFT JOIN "competitor_pages" p ON p.id = l."competitorPageId"
    ORDER BY l."loggedOn" DESC
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
          Converted property listings extracted from crawled pages.
        </p>
      </div>

      {listings.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No converted property listings found yet. Convert crawled pages in{' '}
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
            className="rounded-none border-t-0 first:rounded-t-lg first:border-t last:rounded-b-lg hover:border-primary transition-colors"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-primary" />
                <ClientLink href={`/manage/intelligence/listings/${listing.id}`} data-listing-id={listing.id} className="hover:underline">
                  {listing.title}
                </ClientLink>
              </CardTitle>
              <CardDescription className="truncate">
                {listing.sourceUrl ?? 'Unknown source'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span>{new Date(listing.loggedOn).toLocaleDateString()}</span>
                <span>{listing.sourceTitle ?? 'Source title unavailable'}</span>
              </div>
              <Badge variant="secondary">Logged</Badge>
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
