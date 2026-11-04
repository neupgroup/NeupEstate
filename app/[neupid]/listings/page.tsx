import { notFound } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@neup/components/ui/alert';
import { ListingCard } from '@/components/property-card';
import { getAccountProfileByNeupId } from '@/services/accounts/profile';
import { getListingsByAccount } from '@/services/listings/list';
import { AlertCircle, Home } from 'lucide-react';

/** Extract the NeupID from the @prefixed dynamic route segment. */
function resolveNeupId(routeNeupId: string) {
  const decodedRouteNeupId = decodeURIComponent(routeNeupId);
  if (!decodedRouteNeupId.startsWith('@')) return null;
  const neupId = decodedRouteNeupId.slice(1).trim();
  return neupId || null;
}

/** Show active properties represented by the public account. */
export default async function PublicAccountListingsPage({
  params,
}: {
  params: Promise<{ neupid: string }>;
}) {
  const { neupid: routeNeupId } = await params;
  const neupId = resolveNeupId(routeNeupId);
  if (!neupId) notFound();

  const account = await getAccountProfileByNeupId(neupId);
  if (!account) notFound();

  const accountListings = await getListingsByAccount(account.profile.id, 0, 100);
  const listings = accountListings.filter((property) => property.status === 'ACTIVE');

  return (
    <main className="flex-1">
      <section className="bg-background">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Home className="h-4 w-4" /> @{account.profile.neupid}
          </p>
          <h1 className="mt-5 text-4xl font-headline font-semibold tracking-tight sm:text-5xl">Listings by {account.profile.name}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">Browse active listings represented by this profile.</p>
        </div>
      </section>
      <section className="bg-muted/20 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="container mx-auto">
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {listings.map((property) => <ListingCard key={property.id} property={property} />)}
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Listings Found</AlertTitle>
              <AlertDescription>This profile does not have any active listings yet.</AlertDescription>
            </Alert>
          )}
        </div>
      </section>
    </main>
  );
}
