import { prisma } from '@/logica/core/prisma';
import { ClientLink } from '@/components/client-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Link2 } from 'lucide-react';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { Pagination } from '@/components/manage/pagination';
import { ExtractListingButton } from './extract-button';

export default async function ListingsIntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const listings = await prisma.$queryRaw<Array<any>>`
    SELECT *
    FROM "competitor_pages"
    ORDER BY "createdAt" DESC
  `;
  const savedRows = await prisma.$queryRaw<Array<{ competitorPageId: string; loggedOn: Date }>>`
    SELECT "competitorPageId", "loggedOn"
    FROM "competitor_listings"
  `;
  const savedByPageId = new Map(savedRows.map((row) => [row.competitorPageId, row.loggedOn]));

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
          Convert saved pages into structured property listings with Genkit.
        </p>
      </div>

      {listings.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No source pages found yet. Add pages in{' '}
          <ClientLink href="/manage/intelligence/logs" className="text-primary underline">
            Logs
          </ClientLink>
          .
        </p>
      )}

      <div className="space-y-0">
        {currentListings.map((page) => (
          <Card
            key={page.id}
            className="rounded-none border-t-0 first:rounded-t-lg first:border-t last:rounded-b-lg hover:border-primary transition-colors"
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-primary" />
                <a href={page.source} target="_blank" rel="noreferrer" className="hover:underline">
                  {page.title}
                </a>
              </CardTitle>
              <CardDescription className="truncate">
                {page.source}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span>
                  {savedByPageId.has(page.id)
                    ? `Listing saved on ${new Date(savedByPageId.get(page.id) as Date).toLocaleDateString()}`
                    : page.lastLoggedStatus
                      ? `HTTP ${page.lastLoggedStatus} logged on ${page.lastLoggedOn ? new Date(page.lastLoggedOn).toLocaleDateString() : 'unknown date'}`
                      : 'Not extracted yet'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {savedByPageId.has(page.id) ? (
                  <Badge variant="secondary">Saved</Badge>
                ) : page.lastLoggedStatus ? (
                  <Badge variant="destructive">HTTP {page.lastLoggedStatus}</Badge>
                ) : (
                  <ExtractListingButton competitorPageId={page.id} />
                )}
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
