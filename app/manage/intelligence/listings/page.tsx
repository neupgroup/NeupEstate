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
  const listings = await prisma.competitorProperty.findMany({
    orderBy: { createdAt: 'desc' },
  });
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
            className="rounded-none border-t-0 first:rounded-t-lg first:border-t last:rounded-b-lg hover:border-primary transition-colors"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-primary" />
                <a href={listing.source} target="_blank" rel="noreferrer" className="hover:underline">
                  {listing.title}
                </a>
              </CardTitle>
              <CardDescription className="truncate">
                {listing.source}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                {listing.listedOn ? new Date(listing.listedOn).toLocaleDateString() : new Date(listing.createdAt).toLocaleDateString()}
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
