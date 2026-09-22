"use server";

import { naturalLanguagePropertySearch as naturalLanguagePropertySearchFlow } from "@/services/ai/natural-language-property-search";
import { recommendProperties as recommendPropertiesFlow } from "@/services/ai/ai-powered-recommendations";
import { extractAndSaveProperty as extractAndSavePropertyFlow, type ExtractPropertyDetailsOutput } from "@/services/ai/extract-property-details-flow";
import { getPaginatedProperties } from '@/services/properties/list';
import { updatePropertyImages } from '@/services/property/update';
import { logProblem } from '@/services/problem-service';
import type { NaturalLanguageSearchOutput, Property, PropertyFilters } from "@/types";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { getUserPreferences } from '@/services/user-preference-service';

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
    await logProblem(e, 'naturalLanguagePropertySearch');
    return { success: false, data: null, error: "An AI error occurred during the search. Please try again." };
  }
}

export async function recommendProperties(userId: string): Promise<{ success: boolean; data: PropertyFilters[] | null; error: string | null }> {
    try {
        if (!userId) {
            return { success: false, data: null, error: "User ID is required for recommendations." };
        }
        const preferences = await getUserPreferences(userId);
        if (!preferences) {
          return { success: false, data: null, error: "Could not retrieve user preferences." };
        }
        const result = await recommendPropertiesFlow(preferences);
        return { success: true, data: result.filters, error: null };
    } catch (e) {
        await logProblem(e, 'recommendProperties');
        return { success: false, data: null, error: "Could not fetch AI recommendations." };
    }
}

export async function searchProperties(
  params: { [key: string]: any }
): Promise<{ success: boolean; data: { properties: Property[]; totalCount: number, appliedFilters: PropertyFilters } | null; error: string | null }> {
  try {
    noStore(); // Dynamic search, should not be cached
    const { q, page, ...structuredFilters } = params;
    const currentPage = Number(page) || 1;
    const limit = 18;
    
    // Check if the input is already a structured filter from the recommendation engine
    const isStructuredRequest = typeof params === 'object' && !('q' in params) && Object.keys(structuredFilters).length > 0;

    let combinedFilters: PropertyFilters = {};

    if (isStructuredRequest) {
      // The request is already a structured filter object. Use it directly.
      combinedFilters = structuredFilters;
    } else {
      // It's a regular search, likely with a text query `q`.
      let parsedQueryFilters: PropertyFilters = {};
      const isRecordId = q && typeof q === 'string' && /^c[a-z0-9]{24}@base/.test(q as string);

      if (isRecordId) {
        parsedQueryFilters = { id: q as string };
      } else if (q && typeof q === 'string') {
        try {
          const nlResult = await naturalLanguagePropertySearchFlow({ query: q });
          if (nlResult.location) parsedQueryFilters.location = nlResult.location;
          if (nlResult.minPrice) parsedQueryFilters.minPrice = nlResult.minPrice;
          if (nlResult.maxPrice) parsedQueryFilters.maxPrice = nlResult.maxPrice;
          if (nlResult.space?.bedroom) parsedQueryFilters.bedrooms = nlResult.space.bedroom;
          if (nlResult.space?.bathroom) parsedQueryFilters.bathrooms = nlResult.space.bathroom;
          // ... and so on for other fields
          const searchTermParts = [];
          if (nlResult.body) searchTermParts.push(nlResult.body);
          if (nlResult.tags && nlResult.tags.length > 0) {
            searchTermParts.push(...nlResult.tags);
            parsedQueryFilters.tags = nlResult.tags;
          }
          if (searchTermParts.length > 0) parsedQueryFilters.searchTerm = searchTermParts.join(' ');
        } catch (e) {
          console.error("Failed to parse natural language query:", e);
          parsedQueryFilters = { searchTerm: q as string };
        }
      }

      // Merge AI-parsed filters with any specific filters from the sidebar
      combinedFilters = { ...parsedQueryFilters, ...structuredFilters };
    }
    
    // Type checking and sanitization
    if (combinedFilters.minPrice) combinedFilters.minPrice = Number(combinedFilters.minPrice);
    if (combinedFilters.maxPrice) combinedFilters.maxPrice = Number(combinedFilters.maxPrice);
    if (combinedFilters.bedrooms) combinedFilters.bedrooms = Number(combinedFilters.bedrooms);
    if (combinedFilters.bathrooms) combinedFilters.bathrooms = Number(combinedFilters.bathrooms);
    // ... etc. for other number fields

    combinedFilters.status = 'approved';

    const { properties, totalCount } = await getPaginatedProperties({ filters: combinedFilters, page: currentPage, limit });
    
    return { success: true, data: { properties, totalCount, appliedFilters: combinedFilters }, error: null };
  } catch (e: any) {
    await logProblem(e, 'searchProperties');
    return { success: false, data: null, error: e.message || "An error occurred during the search." };
  }
}


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
            await logProblem(e, `extractAndSaveProperty (URL: ${url})`);
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

export async function applyFetchedImagesToPropertyAction(
  propertyId: string,
  images: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    await updatePropertyImages(propertyId, images);
    revalidatePath(`/manage/properties/${propertyId}/edit`);
    return { success: true };
  } catch (e: any) {
    await logProblem(e, `applyFetchedImagesToPropertyAction (ID: ${propertyId})`);
    return { success: false, error: e.message };
  }
}
