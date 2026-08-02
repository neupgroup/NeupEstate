import { notFound } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { PropertyCard } from '@/components/property-card';
import { getPublicAgencyAccountByNeupId } from '@/services/agency-service';
import { getBridgePropertiesByAccount } from '@/services/property';
import { AlertCircle, Home } from 'lucide-react';

function resolveNeupId(handle: string) {
  const decodedHandle = decodeURIComponent(handle);
  if (!decodedHandle.startsWith('@')) return null;
  const neupId = decodedHandle.slice(1).trim();
  return neupId.length > 0 ? neupId : null;
}

export default async function PublicAgencyPropertiesPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const neupId = resolveNeupId(handle);
  if (!neupId) notFound();

  const agency = await getPublicAgencyAccountByNeupId(neupId);
  if (!agency) notFound();

  const result = await getBridgePropertiesByAccount({
    agencyId: agency.id,
    includeInactive: false,
    limit: 100,
    offset: 0,
  });

  return (
    <main className="flex-1">
      <div className="bg-secondary">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="flex items-center gap-3 text-4xl font-headline font-bold">
            <Home className="h-8 w-8 text-primary" />
            {agency.name} Properties
          </h1>
          <p className="mt-2 text-muted-foreground">@{agency.neupId}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {result.properties.length > 0 ? (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {result.properties.map((property) => (
              <PropertyCard key={property.id} property={property as any} />
            ))}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Properties Found</AlertTitle>
            <AlertDescription>This agency does not have any public properties yet.</AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}
