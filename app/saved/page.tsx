"use client";

import { useEffect, useState } from "react";
import { searchProperties } from "@/app/actions";
import { PropertyCard } from "@/components/estate";
import { Skeleton } from "@/components/ui/skeleton";
import type { Property, PropertyFilters } from "@/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Mock function to get user requirements. In a real app, this would come from a service/DB.
function getMockUserRequirements(): PropertyFilters {
    return {
        purpose: ['Sale'],
        category: ['House', 'Apartment'],
        minPrice: 100000,
        maxPrice: 850000,
        location: 'Kathmandu',
    };
}


export function RecommendedProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasRequirements, setHasRequirements] = useState(false);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setIsLoading(true);
        setError(null);
        
        // In a real app, you'd fetch the user's saved requirements.
        // For this demo, we'll use mock data.
        const requirements = getMockUserRequirements();
        
        if (!requirements || Object.keys(requirements).length === 0) {
          setHasRequirements(false);
          setIsLoading(false);
          return;
        }
        
        setHasRequirements(true);
        
        const searchResult = await searchProperties(requirements as any);
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
  }, []);

  if (!hasRequirements && !isLoading) {
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

export default RecommendedProperties;
