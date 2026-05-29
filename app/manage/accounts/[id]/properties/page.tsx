import { getPaginatedProperties } from '@/services/property-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home } from 'lucide-react';
import { AdminPropertyRow } from '@/components/manage/property-row';

export default async function AccountPropertiesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = await params;
  const ownedProperties = await getPaginatedProperties({ ownerAccountId: accountId, includeInactive: true, limit: 50 });

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Home className="h-4 w-4" />
          Properties
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {ownedProperties.totalCount} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {ownedProperties.properties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No properties linked to this account.</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-lg border">
            {ownedProperties.properties.map((property) => (
              <AdminPropertyRow key={property.id} property={property} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
