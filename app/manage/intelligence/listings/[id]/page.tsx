import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { prisma } from '@/logica/core/prisma';
import { logProblem } from '@/services/problem-service';
import { ClientLink } from '@/components/client-link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BadgeInfo, CalendarDays, CircleDollarSign, ExternalLink, Images, Layers3, MapPin, Ruler, User } from 'lucide-react';

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'Not provided';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function asNumber(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not provided';
  const num = Number(value);
  return Number.isFinite(num) ? num.toLocaleString() : String(value);
}

export default async function IntelligenceListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const { id } = await params;

  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT
      l.*,
      p.id AS "sourcePageId",
      p.title AS "sourceTitle",
      p.source AS "sourceUrl",
      p."lastLoggedStatus" AS "sourceLastLoggedStatus",
      p."lastLoggedOn" AS "sourceLastLoggedOn",
      p."listedOn" AS "sourceListedOn",
      p.details AS "sourceDetails"
    FROM "competitor_listings" l
    LEFT JOIN "competitor_pages" p ON p.id = l."competitorPageId"
    WHERE l.id = ${id}
    LIMIT 1
  `;

  const listing = rows[0] ?? null;
  if (!listing) {
    await logProblem(new Error('Listing detail lookup returned no rows.'), 'manage/intelligence/listings/[id]', {
      clickedId: id,
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <ClientLink href="/manage/intelligence/listings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to listings
          </ClientLink>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Listing not found</CardTitle>
            <CardDescription>
              The listing id <span className="font-mono">{id}</span> did not resolve.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const details = (listing.details as Record<string, unknown> | null) ?? (listing.sourceDetails as Record<string, unknown> | null) ?? null;
  const images = Array.isArray(details?.images) ? details.images.filter((item): item is string => typeof item === 'string') : [];
  const heroPrice = listing.price
    ? (typeof listing.price === 'object' ? JSON.stringify(listing.price) : String(listing.price))
    : (details?.price !== undefined ? asNumber(details.price) : 'Not provided');
  const title = listing.title;
  const description = listing.description || listing.sourceTitle || (typeof details?.reason === 'string' ? details.reason : null);

  const infoRows = [
    { label: 'Purpose', value: listing.purpose || details?.purpose },
    { label: 'Category', value: details?.category },
    { label: 'Type', value: details?.type },
    { label: 'Location', value: details?.location },
    { label: 'Bedrooms', value: details?.bedrooms },
    { label: 'Bathrooms', value: details?.bathrooms },
    { label: 'Area', value: details?.area },
    { label: 'Floors', value: details?.floors },
    { label: 'Road access', value: details?.roadAccess },
    { label: 'Agent', value: details?.listingAgent || listing.agentName },
    { label: 'Owner listing', value: typeof details?.isOwnerListing === 'boolean' ? (details.isOwnerListing ? 'Yes' : 'No') : undefined },
    { label: 'Price basis', value: listing.priceBasis },
    { label: 'Logged on', value: new Date(listing.loggedOn).toLocaleString() },
    { label: 'Source page', value: listing.sourceTitle ?? 'Not available' },
    { label: 'Source status', value: listing.sourceLastLoggedStatus || 'not set' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <ClientLink href="/manage/intelligence/listings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to listings
        </ClientLink>
        <Badge variant="secondary">Logged</Badge>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {listing.purpose && <Badge variant="secondary">{listing.purpose}</Badge>}
                {typeof details?.category === 'string' && <Badge variant="outline">{details.category}</Badge>}
                {typeof details?.type === 'string' && <Badge variant="outline">{details.type}</Badge>}
              </div>
              <div className="space-y-1">
                <CardTitle className="text-3xl tracking-tight">{title}</CardTitle>
                {description && <CardDescription className="max-w-3xl text-base">{description}</CardDescription>}
              </div>
            </div>
            <div className="rounded-xl border bg-background p-4 shadow-sm min-w-[240px]">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Price</div>
              <div className="mt-2 text-3xl font-semibold">{heroPrice}</div>
              <div className="mt-3 text-sm text-muted-foreground">
                {listing.sourceUrl ?? 'Source unavailable'}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {infoRows.map((row) => (
              <div key={row.label} className="rounded-lg border bg-card p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</div>
                <div className="mt-2 text-sm font-medium whitespace-pre-wrap">{formatValue(row.value)}</div>
              </div>
            ))}
          </div>

          {images.length > 0 && (
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Images className="h-5 w-5 text-primary" />
                Images
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {images.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-xl border bg-muted">
                    <img src={src} alt={title} className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BadgeInfo className="h-4 w-4 text-primary" />
                  Full listing payload
                </CardTitle>
                <CardDescription>Structured JSON saved after extraction.</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[520px] overflow-auto rounded-lg bg-muted p-4 text-xs leading-6">
                  {JSON.stringify(
                    {
                      listing: {
                        id: listing.id,
                        competitorPageId: listing.competitorPageId,
                        title: listing.title,
                        description: listing.description,
                        purpose: listing.purpose,
                        agentName: listing.agentName,
                        price: listing.price,
                        priceBasis: listing.priceBasis,
                        isSold: listing.isSold,
                        details: listing.details,
                        loggedOn: listing.loggedOn,
                        createdAt: listing.createdAt,
                        updatedAt: listing.updatedAt,
                      },
                      sourcePage: listing.sourceUrl
                        ? {
                            id: listing.sourcePageId,
                            title: listing.sourceTitle,
                            source: listing.sourceUrl,
                            lastLoggedStatus: listing.sourceLastLoggedStatus,
                            lastLoggedOn: listing.sourceLastLoggedOn,
                            listedOn: listing.sourceListedOn,
                          }
                        : null,
                      details,
                    },
                    null,
                    2,
                  )}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source and timeline</CardTitle>
                <CardDescription>Reference data for this converted property listing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <ExternalLink className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-muted-foreground">Source URL</div>
                    {listing.sourceUrl ? (
                      <a href={listing.sourceUrl} target="_blank" rel="noreferrer" className="break-all text-primary underline">
                        {listing.sourceUrl}
                      </a>
                    ) : (
                      <div>Not available</div>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground">Logged on</div>
                    <div>{new Date(listing.loggedOn).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground">Location</div>
                    <div>{formatValue(details?.location)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CircleDollarSign className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground">Price</div>
                    <div>{heroPrice}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground">Agent</div>
                    <div>{formatValue(details?.listingAgent || listing.agentName)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Ruler className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground">Area</div>
                    <div>{formatValue(details?.area)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Layers3 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-muted-foreground">Floors / road access</div>
                    <div>{`${formatValue(details?.floors)} / ${formatValue(details?.roadAccess)}`}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
