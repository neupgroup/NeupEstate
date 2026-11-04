import { prisma } from '@neup/core/database/prisma';
import { Link } from '@neup/components/ui/link';
import { Pagination } from '@/components/estate';
import { MapPin, Search } from 'lucide-react';

const LOCATIONS_PER_PAGE = 50;

// Read a positive page number from Next.js search parameters.
function readPageNumber(value: string | string[] | undefined): number {
  const pageValue = Array.isArray(value) ? value[0] : value;
  const page = Number(pageValue ?? '1');
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

// Render a searchable, paginated directory of active locations.
export default async function LocationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawQuery = resolvedSearchParams?.query;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? '';
  const requestedPage = readPageNumber(resolvedSearchParams?.page);
  const where = {
    status: 'active',
    ...(query ? {
      OR: [
        { title: { contains: query, mode: 'insensitive' as const } },
        { slug: { contains: query, mode: 'insensitive' as const } },
        { postalCode: { contains: query, mode: 'insensitive' as const } },
      ],
    } : {}),
  };

  const totalLocations = await prisma.location.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalLocations / LOCATIONS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const locations = await prisma.location.findMany({
    where,
    orderBy: [{ type: 'asc' }, { title: 'asc' }, { id: 'asc' }],
    skip: (currentPage - 1) * LOCATIONS_PER_PAGE,
    take: LOCATIONS_PER_PAGE,
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      postalCode: true,
      parent: { select: { title: true } },
    },
  });

  return (
    <main className="flex-1">
      <section className="border-b bg-background">
        <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <MapPin className="h-4 w-4" aria-hidden="true" /> Explore locations
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Find properties by location</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Choose an area to see active properties listed there.
          </p>
          <form role="search" method="GET" className="mt-6 flex max-w-xl gap-2">
            <label className="sr-only" htmlFor="location-query">Search locations</label>
            <input
              id="location-query"
              name="query"
              type="search"
              defaultValue={query}
              placeholder="Search by location name or postal code"
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Search className="h-4 w-4" aria-hidden="true" /> Search
            </button>
          </form>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="mb-5 text-sm text-muted-foreground">
          Showing {locations.length} of {totalLocations} locations
        </div>
        {locations.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => (
                <article key={location.id} className="rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/50">
                  {location.slug ? (
                    <Link href={`/locations/${encodeURIComponent(`${location.slug}--${location.id}`)}`} className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <h2 className="text-lg font-semibold hover:text-primary">{location.title}</h2>
                    </Link>
                  ) : (
                    <h2 className="text-lg font-semibold">{location.title}</h2>
                  )}
                  <p className="mt-1 text-sm capitalize text-muted-foreground">
                    {location.type.replace(/([a-z])([A-Z])/g, '$1 $2')}
                    {location.parent ? ` · ${location.parent.title}` : ''}
                    {location.postalCode ? ` · ${location.postalCode}` : ''}
                  </p>
                </article>
              ))}
            </div>
            {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} />}
          </>
        ) : (
          <div className="rounded-xl border border-dashed px-6 py-14 text-center">
            <h2 className="text-lg font-semibold">No locations found</h2>
            <p className="mt-2 text-sm text-muted-foreground">Try another location name or postal code.</p>
          </div>
        )}
      </section>
    </main>
  );
}
