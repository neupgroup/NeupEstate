import { notFound } from 'next/navigation';
import { prisma } from '@neup/core/database/prisma';
import { Alert, AlertDescription, AlertTitle } from '@neup/components/ui/alert';
import { Link } from '@neup/components/ui/link';
import { Pagination } from '@/components/estate';
import { ListingCard } from '@/components/property-card';
import { getPaginatedListings } from '@/services/listings/list';
import { AlertCircle, MapPin } from 'lucide-react';

const PROPERTIES_PER_PAGE = 15;
const LOCATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LocationRouteIdentifier = { slug: string; id: string };

// Parse the canonical location slug and UUID from the final -- separator.
function parseLocationRouteIdentifier(value: string): LocationRouteIdentifier | null {
  const separator = value.lastIndexOf('--');
  if (separator < 1 || separator + 2 >= value.length) return null;

  const slug = value.slice(0, separator);
  const id = value.slice(separator + 2);
  if (!LOCATION_SLUG_PATTERN.test(slug) || !UUID_PATTERN.test(id)) return null;

  return { slug, id };
}

// Resolve the location only when both its slug and ID match the URL.
async function getLocationFromRoute(value: string) {
  const identifier = parseLocationRouteIdentifier(value);
  if (!identifier) return null;

  return prisma.location.findFirst({
    where: { id: identifier.id, slug: identifier.slug },
    select: { id: true, title: true, slug: true, type: true, postalCode: true },
  });
}

// Read a positive page number from Next.js search parameters.
function readPageNumber(value: string | string[] | undefined): number {
  const pageValue = Array.isArray(value) ? value[0] : value;
  const page = Number(pageValue ?? '1');
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

// Render active property listings associated with one verified location.
export default async function LocationListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ slug: routeSlug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const location = await getLocationFromRoute(routeSlug);
  if (!location) notFound();

  const requestedPage = readPageNumber(resolvedSearchParams?.page);
  const results = await getPaginatedListings({
    page: requestedPage,
    limit: PROPERTIES_PER_PAGE,
    filters: { location: location.title },
    orderBy: 'newestFirst',
  });
  const totalPages = Math.max(1, Math.ceil(results.totalCount / PROPERTIES_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageResults = currentPage === requestedPage
    ? results
    : await getPaginatedListings({
        page: currentPage,
        limit: PROPERTIES_PER_PAGE,
        filters: { location: location.title },
        orderBy: 'newestFirst',
      });

  return (
    <main className="flex-1">
      <section className="border-b bg-background">
        <div className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <Link href="/locations" className="text-sm text-muted-foreground hover:text-foreground">
            Browse all locations
          </Link>
          <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            <span>{location.type}</span>
            {location.postalCode && <span className="text-muted-foreground">· {location.postalCode}</span>}
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Listings in {location.title}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {results.totalCount} {results.totalCount === 1 ? 'property' : 'properties'} available in this location.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {pageResults.listings.length ? (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pageResults.listings.map((property) => (
                <ListingCard key={property.id} property={property} />
              ))}
            </div>
            {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} />}
          </>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No listings found</AlertTitle>
            <AlertDescription>
              There are no active listings listed in {location.title} yet.{' '}
              <Link href="/search" className="underline">Browse all listings</Link>.
            </AlertDescription>
          </Alert>
        )}
      </section>
    </main>
  );
}
