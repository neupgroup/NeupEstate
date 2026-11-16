import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@neup/components/ui/card';
import { Link } from '@neup/components/ui/link';
import { prisma } from '@neup/core/database/prisma';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

// Generate the same canonical slug used by the competitors list.
function createCompetitorSlug(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'competitor';
}

// Display one competitor and its configured sources and listings.
export default async function CompetitorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const { slug: slugId } = await params;
  const separator = slugId.lastIndexOf('--');
  if (separator <= 0 || separator + 2 >= slugId.length) notFound();
  const slug = slugId.slice(0, separator);
  const id = slugId.slice(separator + 2);
  const competitor = await prisma.competitor.findUnique({
    where: { id },
    include: { sources: { orderBy: { createdAt: 'asc' } }, listings: { orderBy: { updatedAt: 'desc' }, take: 20 } },
  });
  if (!competitor || createCompetitorSlug(competitor.name) !== slug) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/manage/competitors" className="text-sm text-primary underline">Competitors</Link>
        <h1 className="mt-2 text-2xl font-semibold">{competitor.name}</h1>
        {competitor.description && <p className="mt-1 text-sm text-muted-foreground">{competitor.description}</p>}
      </div>

      <section aria-labelledby="competitor-sources-heading" className="space-y-3">
        <div>
          <h2 id="competitor-sources-heading" className="text-xl font-semibold">Sources</h2>
          <p className="text-sm text-muted-foreground">Configured feeds and pages for this competitor.</p>
        </div>
        {competitor.sources.length ? (
          <div className="space-y-2">
            {competitor.sources.map((source) => (
              <Card key={source.id}>
                <CardContent className="flex flex-col gap-1 p-4 sm:flex-row sm:items-start sm:gap-4">
                  <span className="w-24 shrink-0 text-sm font-medium capitalize">{source.type}</span>
                  <a href={source.value} target="_blank" rel="noreferrer" className="break-all text-sm text-primary underline">{source.value}</a>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : <Card><CardContent className="p-4 text-sm text-muted-foreground">No sources configured.</CardContent></Card>}
      </section>

      <section aria-labelledby="competitor-listings-heading" className="space-y-3">
        <div>
          <h2 id="competitor-listings-heading" className="text-xl font-semibold">Listings</h2>
          <p className="text-sm text-muted-foreground">The 20 most recently updated listings from this competitor.</p>
        </div>
        {competitor.listings.length ? (
          <div className="space-y-2">
            {competitor.listings.map((listing) => (
              <Card key={listing.id}>
                <CardHeader className="pb-2"><CardTitle className="text-base">{listing.title}</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground">{listing.purpose}{listing.isSold ? ' · Sold' : ''}</CardContent>
              </Card>
            ))}
          </div>
        ) : <Card><CardContent className="p-4 text-sm text-muted-foreground">No listings recorded.</CardContent></Card>}
      </section>
    </div>
  );
}
