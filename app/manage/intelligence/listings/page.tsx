import { prisma } from '@/core/database/prisma';
import { ClientLink } from '@/components/client-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListChecks } from 'lucide-react';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';
import { Pagination } from '@/components/manage/pagination';

function formatCompactValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function decodeMaybeEncodedText(value: string): string {
  if (!value.includes('%') && !value.includes('+')) return value;

  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function formatPrice(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toLocaleString();
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric.toLocaleString();
  return String(value);
}

function formatListingTitle(title: unknown): string {
  const value = formatCompactValue(title) ?? 'Untitled';
  return decodeMaybeEncodedText(value.replace(/^property\s*\/\s*/i, ''));
}

function getListingSummary(listing: any) {
  const details = (listing.details as Record<string, unknown> | null) ?? null;
  const competitorName = formatCompactValue(
    listing.competitorName ??
      listing.pageCompetitorName ??
      listing.competitor?.name ??
      listing.pageCompetitor?.name ??
      details?.competitorName ??
      details?.competitor ??
      details?.sourceName,
  );
  const agencyName = formatCompactValue(details?.agencyName ?? details?.agency);
  const price = formatPrice(listing.price ?? details?.price);
  const priceBasis = formatCompactValue(listing.priceBasis ?? details?.priceBasis);

  return {
    competitorName,
    agencyName,
    price,
    priceBasis,
  };
}

export default async function ListingsIntelligencePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const listings = await prisma.$queryRaw<Array<any>>`
    SELECT
      l.*,
      c.name AS "competitorName",
      cp.name AS "pageCompetitorName",
      p.id AS "sourcePageId",
      p.title AS "sourceTitle",
      p.source AS "sourceUrl",
      p."lastLoggedStatus" AS "sourceLastLoggedStatus",
      p."lastLoggedOn" AS "sourceLastLoggedOn",
      p."listedOn" AS "sourceListedOn"
    FROM "competitor_listings" l
    LEFT JOIN "competitors" c ON c.id = l."competitorId"
    LEFT JOIN "competitor_pages" p ON p.id = l."competitorPageId"
    LEFT JOIN "competitors" cp ON cp.id = p."competitorId"
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
        {currentListings.map((listing) => {
          const summary = getListingSummary(listing);

          return (
            <Card
              key={listing.id}
              className="rounded-none border-t-0 first:rounded-t-lg first:border-t last:rounded-b-lg hover:border-primary transition-colors"
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-start gap-3 text-base leading-tight min-w-0">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                  <ClientLink
                    href={`/manage/intelligence/listings/${listing.id}`}
                    data-listing-id={listing.id}
                    className="block min-w-0 flex-1 break-words hover:underline"
                  >
                    {formatListingTitle(listing.title)}
                  </ClientLink>
                </CardTitle>
                <CardDescription className="pl-5 min-w-0 break-words">
                  by {summary.competitorName ?? 'Unknown competitor'}
                  {summary.agencyName ? `, ${summary.agencyName}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1.5 pt-0 pl-5">
                <div className="text-sm font-medium">
                  {summary.price ? `NPR ${summary.price}` : 'Price not provided'}
                  {summary.priceBasis ? ` ${summary.priceBasis}` : ''}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {totalPages > 1 && (
        <Pagination totalPages={totalPages} currentPage={currentPage} />
      )}
    </div>
  );
}
