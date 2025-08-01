
'use client';

import { useEffect, useState } from "react";
import { searchProperties } from "@/app/actions";
import { PropertyCard } from "./property-card";
import { Skeleton } from "./ui/skeleton";
import type { Property, PropertyFilters } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertCircle } from "lucide-react";
import { type RequirementsFormValues } from "./profile/user-requirements-form";


interface RecommendedPropertiesProps {
  requirements: RequirementsFormValues | null;
}

export function RecommendedProperties({ requirements }: RecommendedPropertiesProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      if (!requirements) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        const searchFilters: PropertyFilters = {
          purpose: [requirements.purpose === 'buy' ? 'Sale' : 'Rent'],
          category: requirements.propertyTypes,
          minPrice: requirements.minPrice,
          maxPrice: requirements.maxPrice,
          location: requirements.location === '' && requirements.otherLocation ? requirements.otherLocation : requirements.location,
        };

        const searchResult = await searchProperties(searchFilters as any);
        if (searchResult.success && searchResult.data) {
          setProperties(searchResult.data.properties.slice(0, 3)); // Show top 3 recommendations
        } else {
          setError(searchResult.error || "Failed to find properties matching recommendations.");
        }

      } catch (e) {
        setError("An unexpected error occurred while fetching recommendations.");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecommendations();
  }, [requirements]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex flex-col space-y-3">
            <Skeleton className="h-[225px] w-full rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!requirements) {
      return (
        <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Recommendations Yet</AlertTitle>
            <AlertDescription>
                Fill out your requirements in the form above to get personalized property recommendations.
            </AlertDescription>
        </Alert>
      )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (properties.length === 0) {
    return (
        <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Matches Found</AlertTitle>
            <AlertDescription>
                We couldn't find any properties that match your current requirements. Try adjusting your criteria.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
