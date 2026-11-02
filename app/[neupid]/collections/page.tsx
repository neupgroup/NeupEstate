import { notFound } from 'next/navigation';
import { RecommendedProperties } from '@/components/estate';
import { getAccountProfileByNeupId } from '@/services/accounts/profile';
import { FolderOpen } from 'lucide-react';

/** Extract the NeupID from the @prefixed dynamic route segment. */
function resolveNeupId(routeNeupId: string) {
  const decodedRouteNeupId = decodeURIComponent(routeNeupId);
  if (!decodedRouteNeupId.startsWith('@')) return null;
  const neupId = decodedRouteNeupId.slice(1).trim();
  return neupId || null;
}

/** Show curated properties on the public account's collections page. */
export default async function PublicAccountCollectionsPage({
  params,
}: {
  params: Promise<{ neupid: string }>;
}) {
  const { neupid: routeNeupId } = await params;
  const neupId = resolveNeupId(routeNeupId);
  if (!neupId) notFound();

  const account = await getAccountProfileByNeupId(neupId);
  if (!account) notFound();

  return (
    <main className="flex-1">
      <section className="bg-background">
        <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <FolderOpen className="h-4 w-4" /> @{account.profile.neupid}
          </p>
          <h1 className="mt-5 text-4xl font-headline font-semibold tracking-tight sm:text-5xl">Property collections</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Explore property recommendations from Neup.Estate.
          </p>
        </div>
      </section>
      <section className="bg-muted/20 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="container mx-auto">
          <RecommendedProperties requirements={null} />
        </div>
      </section>
    </main>
  );
}
