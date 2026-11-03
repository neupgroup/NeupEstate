"use server";

import { parsePropertySearchQuery } from '@/services/intelligence/search-property-query';
import { recommendProperties as recommendPropertiesFlow } from "@/services/intelligence/ai-powered-recommendations";
import { extractAndSaveProperty as extractAndSavePropertyFlow, type ExtractPropertyDetailsOutput } from "@/services/intelligence/extract-property-details-flow";
import { getPaginatedProperties } from '@/services/properties/list';
import { updatePropertyImages } from '@/services/properties/update';
import { logger } from "@neup/logica/logger";
import type { NaturalLanguageSearchOutput, Property, PropertyFilters } from "@/types";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { getAccountPreferences } from '@/services/accounts/single/preferences';



/**
 * naturalLanguagePropertySearch handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function naturalLanguagePropertySearch(
  query: string
): Promise<{ success: boolean; data: NaturalLanguageSearchOutput | null; error: string | null }> {
  try {
    if (!query) {
      return { success: false, data: null, error: "Query cannot be empty." };
    }
    const result = await naturalLanguagePropertySearchFlow({ query });
    return { success: true, data: result, error: null };
  } catch (e) {
    await logger().type('naturalLanguagePropertySearch').data({ error: String(e), details: {} }).log();
    return { success: false, data: null, error: "An AI error occurred during the search. Please try again." };
  }
}



/**
 * recommendProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function recommendProperties(userId: string): Promise<{ success: boolean; data: PropertyFilters[] | null; error: string | null }> {
    try {
        if (!userId) {
            return { success: false, data: null, error: "User ID is required for recommendations." };
        }
        const preferences = await getAccountPreferences(userId);
        if (!preferences) {
          return { success: false, data: null, error: "Could not retrieve user preferences." };
        }
        const result = await recommendPropertiesFlow(preferences);
        return { success: true, data: result.filters, error: null };
    } catch (e) {
        await logger().type('recommendProperties').data({ error: String(e), details: {} }).log();
        return { success: false, data: null, error: "Could not fetch AI recommendations." };
    }
}



/**
 * searchProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function searchProperties(
  params: { [key: string]: any }
): Promise<{ success: boolean; data: { properties: Property[]; totalCount: number, appliedFilters: PropertyFilters } | null; error: string | null }> {
  try {
    noStore(); // Dynamic search, should not be cached
    const { q, page, ...structuredFilters } = params;
    const currentPage = Number(page) || 1;
    const limit = 18;
    
    const normalizedFilters = normalizeSearchFilters(structuredFilters);
    const isStructuredRequest = typeof params === 'object' && !('q' in params) && Object.keys(structuredFilters).length > 0;

    let combinedFilters: PropertyFilters = {};

    if (isStructuredRequest) {
      // The request is already a structured filter object. Use it directly.
      combinedFilters = normalizedFilters;
    } else {
      // It's a regular search, likely with a text query `q`.
      let parsedQueryFilters: PropertyFilters = {};
      const isRecordId = q && typeof q === 'string' && /^c[a-z0-9]{24}@base/.test(q as string);

      if (isRecordId) {
        parsedQueryFilters = { id: q as string };
      } else if (q && typeof q === 'string') {
        try {
          parsedQueryFilters = await parsePropertySearchQuery(q);
        } catch (e) {
          console.error('Failed to parse property search query with Nia:', e);
          parsedQueryFilters = { searchTerm: q as string };
        }
      }

      // Merge AI-parsed filters with any specific filters from the sidebar
      combinedFilters = { ...parsedQueryFilters, ...normalizedFilters };
    }
    
    // Type checking and sanitization
    combinedFilters.status = 'approved';

    const { properties, totalCount } = await getPaginatedProperties({ filters: combinedFilters, page: currentPage, limit });
    
    return { success: true, data: { properties, totalCount, appliedFilters: combinedFilters }, error: null };
  } catch (e: any) {
    await logger().type('searchProperties').data({ error: String(e), details: {} }).log();
    return { success: false, data: null, error: e.message || "An error occurred during the search." };
  }
}

/**
 * Converts query-string and structured search values into the property filter shape.
 * Comma-separated sidebar values are normalized to arrays, and numeric controls to numbers.
 */
function normalizeSearchFilters(filters: Record<string, unknown>): PropertyFilters {
  const arrayFields = ['purpose', 'category', 'type', 'listingBy', 'tags'] as const;
  const numberFields = [
    'minPrice', 'maxPrice', 'minArea', 'maxArea', 'minFloors', 'maxFloors',
    'minRoadAccess', 'maxRoadAccess', 'bedrooms', 'bathrooms', 'kitchens',
    'diningRooms', 'livingRooms', 'carParkingSpots', 'bikeParkingSpots',
    'minBedrooms', 'maxBedrooms', 'minBathrooms', 'maxBathrooms',
    'minKitchens', 'maxKitchens', 'minDiningRooms', 'maxDiningRooms',
    'minLivingRooms', 'maxLivingRooms', 'minCarParkingSpots',
    'maxCarParkingSpots', 'minBikeParkingSpots', 'maxBikeParkingSpots',
  ] as const;
  const normalized: Record<string, unknown> = { ...filters };

  for (const field of arrayFields) {
    const value = filters[field];
    if (Array.isArray(value)) {
      normalized[field] = value.flatMap((item) => String(item).split(',')).map((item) => item.trim()).filter(Boolean);
    } else if (typeof value === 'string') {
      normalized[field] = value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  for (const field of numberFields) {
    const value = filters[field];
    if (typeof value === 'string' && value.trim() !== '') {
      const numberValue = Number(value);
      if (Number.isFinite(numberValue)) normalized[field] = numberValue;
    }
  }

  return normalized as PropertyFilters;
}




/**
 * extractAndSaveProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function extractAndSaveProperty(
  urls: string[]
): Promise<{ success: boolean; results: ({ url: string } & ExtractPropertyDetailsOutput)[] }> {
    const results: ({ url: string } & ExtractPropertyDetailsOutput)[] = [];
    for (const url of urls) {
        try {
            if (!url.trim()) continue;
            const result = await extractAndSavePropertyFlow({ url, saveToDb: true });

            if (result.error) {
                results.push({ url, ...result });
                continue;
            }

            if (result.propertyId) {
                results.push({ url, ...result });
                continue;
            }

            results.push({
                url,
                ...result,
                error: "Property details were extracted, but no database record ID was returned.",
            });
        } catch (e: any) {
            await logger().type(`extractAndSaveProperty (URL: ${url})`).data({ error: String(e), details: {} }).log();
            results.push({ url, error: e.message || "An unknown error occurred." });
        }
    }

    try {
        revalidatePath('/manage/properties');
        revalidatePath('/properties');
    } catch (error) {
        console.error('Failed to revalidate property pages after manual import:', error);
    }

    return { success: true, results };
}



/**
 * applyFetchedImagesToPropertyAction handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function applyFetchedImagesToPropertyAction(
  propertyId: string,
  images: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await updatePropertyImages(propertyId, images);
    revalidatePath(`/manage/properties/${propertyId}/edit`);
    return { success: true };
  } catch (e: any) {
    await logger().type(`applyFetchedImagesToPropertyAction (ID: ${propertyId})`).data({ error: String(e), details: {} }).log();
    return { success: false, error: e.message };
  }
}
