

import { getSavedProperties } from "@/services/property-service";
import { PropertyCard } from "@/components/property-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Heart, AlertCircle } from "lucide-react";
import { ClientLink } from "@/components/client-link";
import { cookies } from "next/headers";

export default async function SavedFavouritesPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('temp_account_id')?.value;
  
  let savedProperties: any[] = [];
  if (userId) {
    savedProperties = await getSavedProperties(userId);
  }

  return (
    <main className="flex-1">
      <div className="bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
            <Heart className="h-8 w-8 text-red-500" />
            All Favourite Properties
          </h1>
          <p className="mt-2 text-muted-foreground">
            Your personal collection of properties you've saved.
          </p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {savedProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {savedProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Saved Properties</AlertTitle>
              <AlertDescription>
                  You haven't saved any properties yet. Click the heart icon on any listing to add it to this list.
                   <br />
                  <ClientLink href="/search" className="text-primary font-semibold hover:underline mt-2 inline-block">
                     Start Browsing
                  </ClientLink>
              </AlertDescription>
          </Alert>
        )}
      </div>
    </main>
  );
}
