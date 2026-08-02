import { getAccountById } from '@/services/account-service';
import { getSavedProperties } from '@/services/property';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bookmark } from 'lucide-react';
import { AdminPropertyRow } from '@/components/manage/property-row';

export default async function AccountSavedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = await params;
  const account = await getAccountById(accountId);
  const savedProperties = account?.registered ? await getSavedProperties(accountId) : [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bookmark className="h-4 w-4" />
          Saved Properties
        </CardTitle>
      </CardHeader>
      <CardContent>
        {savedProperties.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved properties.</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-lg border">
            {savedProperties.map((property) => (
              <AdminPropertyRow key={property.id} property={property} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
