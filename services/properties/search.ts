"use server";

import { parsePropertySearchQuery } from '@/services/intelligence/search-property-query';
import { naturalLanguagePropertySearch as naturalLanguagePropertySearchFlow } from '@/services/intelligence/natural-language-property-search';
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
    const { q, page, limit: requestedLimit, statuses, orderBy, agencyId, agentId, ...structuredFilters } = params;
    const currentPage = Math.max(1, Number(page) || 1);
    const limit = Math.min(100, Math.max(1, Number(requestedLimit) || 18));
    const offset = (currentPage - 1) * limit;
    const candidateLimit = Math.min(2000, offset + limit);
    const normalizedFilters = normalizeSearchFilters(structuredFilters);
    const isStructuredRequest = typeof params === 'object' && !('q' in params) && Object.keys(structuredFilters).length > 0;
    const normalizedStatuses = Array.isArray(statuses) ? statuses.map(String) : undefined;
    const query = typeof q === 'string' ? q.trim() : '';
    if (query && normalizedFilters.searchTerm === query) delete normalizedFilters.searchTerm;
    const isRecordId = /^c[a-z0-9]{24}@base/.test(query);

    if (!query || isStructuredRequest || isRecordId) {
      const directFilters = isRecordId ? { ...normalizedFilters, id: query } : normalizedFilters;
      if (!normalizedStatuses?.length) directFilters.status = 'approved';
      const result = await searchPropertyBatch(directFilters, currentPage, limit, candidateLimit, normalizedStatuses, orderBy, agencyId, agentId);
      return { success: true, data: { ...result, appliedFilters: directFilters }, error: null };
    }

    const directFilters: PropertyFilters = { ...normalizedFilters, searchTerm: query };
    if (!normalizedStatuses?.length) directFilters.status = 'approved';
    const directSearchPromise = searchPropertyBatch(directFilters, 1, candidateLimit, candidateLimit, normalizedStatuses, orderBy, agencyId, agentId);
    const niaFiltersPromise = getNiaFiltersWithinSearchTimeout(query);
    const [directResult, niaFilters] = await Promise.all([directSearchPromise, niaFiltersPromise]);

    if (!niaFilters || Object.keys(niaFilters).length === 0) {
      return { success: true, data: { ...paginateSearchBatch(directResult, currentPage, limit), appliedFilters: directFilters }, error: null };
    }

    const niaSearchFilters: PropertyFilters = { ...niaFilters, ...normalizedFilters };
    if (!normalizedStatuses?.length) niaSearchFilters.status = 'approved';
    const intersectionFilters: PropertyFilters = { ...niaSearchFilters, searchTerm: query };
    const [niaResult, intersectionResult] = await Promise.all([
      searchPropertyBatch(niaSearchFilters, 1, candidateLimit, candidateLimit, normalizedStatuses, orderBy, agencyId, agentId),
      searchPropertyBatch(intersectionFilters, 1, 1, 1, normalizedStatuses, orderBy, agencyId, agentId),
    ]);
    const mergedResult = mergeSearchBatches(directResult, niaResult, intersectionResult.totalCount, currentPage, limit);
    const appliedFilters = { ...niaSearchFilters, ...(query ? { searchTerm: query } : {}) };

    return { success: true, data: { ...mergedResult, appliedFilters }, error: null };
  } catch (e: any) {
    await logger().type('searchProperties').data({ error: String(e), details: {} }).log();
    return { success: false, data: null, error: e.message || "An error occurred during the search." };
  }
}

type PropertySearchBatch = { properties: Property[]; totalCount: number };

// Fetch one candidate set from the existing property query service.
async function searchPropertyBatch(
  filters: PropertyFilters,
  page: number,
  limit: number,
  candidateLimit: number,
  statuses?: string[],
  orderBy?: 'newestFirst' | 'oldestFirst',
  agencyId?: string,
  agentId?: string,
): Promise<PropertySearchBatch> {
  return getPaginatedProperties({
    filters,
    page,
    limit: page === 1 ? candidateLimit : limit,
    statuses,
    orderBy,
    agencyIds: agencyId ? [agencyId] : undefined,
    agentAccountId: agentId,
  });
}

// Bound the Nia wait so an unavailable intelligence service cannot block text-search results.
async function getNiaFiltersWithinSearchTimeout(query: string): Promise<PropertyFilters | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), 12_000);
  });
  const niaSearch = parsePropertySearchQuery(query)
    .catch((error) => {
      console.error('Failed to parse property search query with Nia:', error);
      return null;
    });

  try {
    return await Promise.race([niaSearch, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

// Return one page from a single search batch.
function paginateSearchBatch(batch: PropertySearchBatch, page: number, limit: number): PropertySearchBatch {
  const offset = (page - 1) * limit;
  return { properties: batch.properties.slice(offset, offset + limit), totalCount: batch.totalCount };
}

// Merge direct and Nia matches, preserving direct-search order and removing duplicate property IDs.
function mergeSearchBatches(
  directResult: PropertySearchBatch,
  niaResult: PropertySearchBatch,
  overlapTotalCount: number,
  page: number,
  limit: number,
): PropertySearchBatch {
  const propertiesById = new Map<string, Property>();
  for (const property of [...directResult.properties, ...niaResult.properties]) {
    if (!propertiesById.has(property.id)) propertiesById.set(property.id, property);
  }

  const mergedProperties = [...propertiesById.values()];
  const estimatedTotalCount = Math.max(
    mergedProperties.length,
    directResult.totalCount + niaResult.totalCount - overlapTotalCount,
  );
  const offset = (page - 1) * limit;
  return {
    properties: mergedProperties.slice(offset, offset + limit),
    totalCount: estimatedTotalCount,
  };
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
