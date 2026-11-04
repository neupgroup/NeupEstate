import { getAccountById } from '@/services/accounts/id/get';
import { getSavedListings } from '@/services/listings';
import { Card, CardContent, CardHeader, CardTitle } from '@neup/components/ui/card';
import { Bookmark } from 'lucide-react';
import { AdminListingRow } from '@/components/manage/property-row';

export default async function AccountSavedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: accountId } = await params;
  const account = await getAccountById(accountId);
  const savedListings = account?.registered ? await getSavedListings(accountId) : [];

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bookmark className="h-4 w-4" />
          Saved Listings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {savedListings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved listings.</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-lg border">
            {savedListings.map((property) => (
              <AdminListingRow key={property.id} property={property} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
