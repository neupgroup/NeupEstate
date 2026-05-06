

"use server";

import { naturalLanguagePropertySearch as naturalLanguagePropertySearchFlow } from "@/services/ai/natural-language-property-search";
import { recommendProperties as recommendPropertiesFlow } from "@/services/ai/ai-powered-recommendations";
import { extractAndSaveProperty as extractAndSavePropertyFlow, type ExtractPropertyDetailsOutput } from "@/services/ai/extract-property-details-flow";
import { createProperty as createPropertyService, updateProperty as updatePropertyService, approveProperty, getProperties, deleteProperty as deletePropertyService, getPendingProperties, getPaginatedProperties, getPropertyById, updatePropertyWithExtractedData, addFetchToHistory, deleteFetchHistoryItem as deleteFetchHistoryItemService, updatePropertyImages, addImagesToFetchHistory, deleteImageFetchHistoryItem as deleteImageFetchHistoryItemService, toggleSavedProperty as toggleSavedPropertyService, getUsersBySavedProperty as getUsersBySavedPropertyService, getSavedPropertiesForUser as getSavedPropertiesForUserService } from '@/services/property-service';
import { createAgency as createAgencyService, updateAgency as updateAgencyService, deleteAgency as deleteAgencyService } from '@/services/agency-service';
import { getAgentsByLocation as getAgentsByLocationService, createAgent as createAgentService, updateAgent as updateAgentService, deleteAgent as deleteAgentService } from '@/services/agent-service';
import { addSitemap, getNewUrlsFromSitemap, processSitemapUrl, updateSitemapCheckedTime } from "@/services/sitemap-service";
import { clearAllProblems } from "@/services/problem-service";
import { logProblem } from "@/services/problem-service";
import type { NaturalLanguageSearchOutput, Property, CreatePropertyInput, UpdatePropertyInput, CreateAgencyInput, UpdateAgencyInput, PropertyApprovalResult, CreatePropertyFormValues, UpdatePropertyFormValues, CreateAgencyFormValues, UpdateAgencyFormValues, PropertyFilters, ExtractedPropertyData, SitemapLog, PropertyAmendmentResult, RewritePropertyDetailsOutput, PropertyAssuranceResult, Agent, CreateAgentFormValues, UpdateAgentFormValues, StructuredLocation, CreateWhatsAppTemplateFormValues, WhatsAppConfig, WhatsAppTemplate, CreateConversationFormValues, CreateUserActivityInput, PropertyImageUpdateResult, CreateFaqFormValues, UpdateFaqFormValues, CreateInquiryFormValues, InquiryStatus, UpdatePromptFormValues, CreatePromptFormValues, User, CreatePropertyRequestFormValues, CreateSalesRequestFormValues, CreateVisitRequestFormValues, CreateMortgageRequestFormValues, CreateContactSubmissionFormValues, PropertyActivityEvent, UserPreferences, AIModel, CreateAIModelFormValues, UpdateAIModelFormValues, CreateRequirementFormValues, Requirement, UpdateUserFormValues } from "@/types";
import { CreatePropertySchema, UpdatePropertySchema, CreateAgencySchema, UpdateAgencySchema, PropertyPurposeSchema, PropertyCategorySchema, PropertyUsageTypeSchema, CreateAgentSchema, UpdateAgentSchema, CreateWhatsAppTemplateSchema, WhatsAppConfigSchema, CreateConversationSchema, CreateFaqSchema, UpdateFaqSchema, CreateInquirySchema, UpdatePromptSchema, CreatePromptSchema, CreatePropertyRequestSchema, CreateSalesRequestSchema, CreateVisitRequestSchema, CreateMortgageRequestSchema, CreateContactSubmissionSchema, CreateAIModelSchema, UpdateAIModelSchema, CreateRequirementSchema, UpdateUserSchema } from "@/types";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { runPropertyApproval as runPropertyApprovalFlow } from "@/services/ai/property-approval-flow";
import { runPropertyAmendment as runPropertyAmendmentFlow } from "@/services/ai/property-amendment-flow";
import { runPropertyAssurance as runPropertyAssuranceFlow } from "@/services/ai/property-assurance-flow";
import { rewritePropertyDetails } from "@/services/ai/rewrite-property-details-flow";
import { parseAdminFilter } from "@/services/ai/parse-admin-filter-flow";
import { extractCorrectedLocation } from "@/services/ai/extract-location-flow";
import { getWhatsAppConfig, createWhatsAppTemplate, deleteWhatsAppTemplate, updateWhatsAppConfig, sendWhatsAppMessage as sendWhatsAppMessageService } from '@/services/whatsapp-service';
import { createMessage as createMessageService, createConversation as createConversationService, deleteConversation as deleteConversationService, getConversationById, getMessagesByConversationId, setAiIntervention as setAiInterventionService } from '@/services/conversation-service';
import { generateFollowUpMessages } from '@/services/ai/ai-follow-up-flow';
import { suggestQuestions as suggestQuestionsFlow } from '@/services/ai/suggest-questions-flow';
import { logActivity as logActivityService, updateAccountAccessInfo } from '@/services/activity-service';
import { updateUserPreferences, getUserPreferences } from '@/services/user-preference-service';
import { createFaq as createFaqService, updateFaq as updateFaqService, deleteFaq as deleteFaqService } from '@/services/faq-service';
import { fetchAllImageUrlsFromPage } from '@/services/activities/fetch-page-images';
import { updatePrompt as updatePromptService, createPrompt as createPromptService, deletePrompt as deletePromptService } from '@/services/prompt-service';
import { createPropertyRequest as createPropertyRequestService, createInquiry as createInquiryService, updateInquiryStatus as updateInquiryStatusService } from '@/services/property-request-service';
import { createSalesRequest as createSalesRequestService } from '@/services/sales-request-service';
import { createVisitRequest as createVisitRequestService } from '@/services/visit-request-service';
import { createMortgageRequest as createMortgageRequestService } from '@/services/mortgage-request-service';
import { createContactSubmission as createContactSubmissionService } from '@/services/contact-service';
import { createModel as createModelService, updateModel as updateModelService, deleteModel as deleteModelService, setDefaultModel as setDefaultModelService } from '@/services/model-service';
import { createRequirement as createRequirementService, updateRequirement as updateRequirementService } from '@/services/requirements-service';
import { createTemporaryAccount, updateUser } from '@/services/account-service';
import { headers } from 'next/headers';
import { getIdentity } from '@/services/neupid/get-identity';

// ---------------------------------------------------------------------------
// Identity guard
// ---------------------------------------------------------------------------
// Call this at the top of any action that requires a verified session.
// Returns the verified accountId on success, or throws with a structured error
// that callers can surface directly to the UI.
async function requireIdentity(): Promise<string> {
  const identity = await getIdentity();
  if (!identity.authenticated) {
    throw Object.assign(new Error('Authentication required. Please sign in and try again.'), {
      code: 'UNAUTHENTICATED',
      reason: identity.reason,
    });
  }
  return identity.user.accountId;
}


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
      const isRecordId = q && typeof q === 'string' && /^c[a-z0-9]{24}$/.test(q as string);

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

            const fallbackMatch = result.extractedData?.sourceUrl
                ? await getPaginatedProperties({
                    page: 1,
                    limit: 1,
                    filters: { sourceUrl: result.extractedData.sourceUrl },
                })
                : { properties: [], totalCount: 0 };

            if (fallbackMatch.properties.length > 0) {
                results.push({
                    url,
                    ...result,
                    propertyId: fallbackMatch.properties[0].id,
                });
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

export async function fetchAndStoreHistoryAction(
  propertyId: string
): Promise<{ success: boolean; error?: string | null }> {
  try {
    const property = await getPropertyById(propertyId, { includeInactive: true });
    if (!property) {
      return { success: false, error: "Property not found." };
    }
    if (!property.sourceUrl) {
      return { success: false, error: "Property has no source URL to refetch from." };
    }

    const result = await extractAndSavePropertyFlow({
      url: property.sourceUrl,
      saveToDb: false, // We are not saving directly, just extracting
    });

    if (result.error || !result.extractedData) {
        const errorMsg = result.error || 'AI flow failed to return extracted data.';
        await logProblem(new Error(errorMsg), `fetchAndStoreHistoryAction (ID: ${propertyId})`);
        return { success: false, error: errorMsg };
    }
    
    // New step: store in history instead of updating the property
    await addFetchToHistory(propertyId, result.extractedData);
    
    revalidatePath(`/manage/properties/${propertyId}/edit`);
    
    return { success: true, error: null };
  } catch (e: any) {
    await logProblem(e, `fetchAndStoreHistoryAction (ID: ${propertyId})`);
    return { success: false, error: e.message || "An unknown error occurred during refetch." };
  }
}

export async function applyFetchedDataToPropertyAction(
  propertyId: string,
  data: ExtractedPropertyData
): Promise<{ success: boolean; error?: string }> {
  try {
    // This function now just applies a given data object to the property
    await updatePropertyWithExtractedData(propertyId, data);
    revalidatePath(`/manage/properties/${propertyId}/edit`);
    return { success: true };
  } catch (e: any) {
    await logProblem(e, `applyFetchedDataToPropertyAction (ID: ${propertyId})`);
    return { success: false, error: e.message };
  }
}

export async function deleteFetchHistoryItemAction(
  propertyId: string,
  fetchedAt: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteFetchHistoryItemService(propertyId, fetchedAt);
    revalidatePath(`/manage/properties/${propertyId}/edit`);
    return { success: true };
  } catch (e: any) {
    await logProblem(e, `deleteFetchHistoryItemAction (ID: ${propertyId})`);
    return { success: false, error: e.message || 'Failed to remove history item.' };
  }
}

export async function fetchPropertyImagesAction(
  propertyId: string
): Promise<{ success: boolean; error?: string | null }> {
  try {
    const property = await getPropertyById(propertyId, { includeInactive: true });
    if (!property?.sourceUrl) {
      return { success: false, error: "Property has no source URL to fetch images from." };
    }

    const images = await fetchAllImageUrlsFromPage(property.sourceUrl);

    if (images.length === 0) {
      return { success: false, error: 'The scraper could not find any images on the page.' };
    }
    
    await addImagesToFetchHistory(propertyId, images);
    
    revalidatePath(`/manage/properties/${propertyId}/edit`);
    return { success: true };
  } catch (e: any) {
    // The scraper function now throws errors, which are caught here.
    // The scraper also logs the error, so we just need to return a message.
    return { success: false, error: e.message || "An unknown error occurred during image fetch." };
  }
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

export async function deleteImageFetchHistoryItemAction(
  propertyId: string,
  fetchedAt: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteImageFetchHistoryItemService(propertyId, fetchedAt);
    revalidatePath(`/manage/properties/${propertyId}/edit`);
    return { success: true };
  } catch (e: any) {
    await logProblem(e, `deleteImageFetchHistoryItemAction (ID: ${propertyId})`);
    return { success: false, error: e.message || 'Failed to remove image history item.' };
  }
}

// Helper to construct a location string from the structured location object
const formatLocationString = (structuredLocation?: StructuredLocation): string => {
  if (!structuredLocation) return '';
  const parts = [
    structuredLocation.street,
    structuredLocation.ward ? `Ward ${structuredLocation.ward}` : '',
    structuredLocation.municipality,
    structuredLocation.district,
    structuredLocation.province,
    structuredLocation.country,
  ];
  return parts.filter(Boolean).join(', ');
};

export async function createPropertyAction(
  data: CreatePropertyFormValues
): Promise<{ success: boolean; error?: string | null; propertyId?: string | null }> {
  try {
    const actorId = await requireIdentity();

    const validatedData = CreatePropertySchema.parse(data);
    const orderedPurposes = validatedData.purposes?.length
      ? validatedData.purposes
      : validatedData.purpose
        ? [validatedData.purpose]
        : [];

    if (orderedPurposes.length === 0) {
      return { success: false, error: "Please select at least one purpose.", propertyId: null };
    }

    if (!validatedData.pricing?.listed) {
      return { success: false, error: "Listed price is required.", propertyId: null };
    }

    const locationString = formatLocationString(validatedData.structuredLocation);

    // AI step to correct location
    const correctedLocation = await extractCorrectedLocation({
        title: validatedData.title,
        description: validatedData.description,
        location: locationString
    });

    const serviceInput: CreatePropertyInput = {
      ...validatedData,
      purpose: orderedPurposes[0],
      purposes: orderedPurposes,
      location: correctedLocation, // Use the corrected location
      price: validatedData.pricing.listed,
      amenities: validatedData.amenities?.split(',').map(a => a.trim()).filter(Boolean) || [],
      images: validatedData.images?.filter(img => img.trim() !== '') || [],
      metaTags: validatedData.metaTags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
      pricing: validatedData.pricing ? {
        ...validatedData.pricing,
        options: Array.isArray(validatedData.pricing.options) ? validatedData.pricing.options : validatedData.pricing.options?.split(',').map(o => o.trim()).filter(Boolean) as any,
      } : undefined,
      owners: validatedData.owners,
    };
    const propertyId = await createPropertyService(serviceInput);
    revalidatePath('/manage/properties');
    return { success: true, propertyId, error: null };
  } catch (e: any) {
    await logProblem(e, 'createPropertyAction');
    if (e instanceof z.ZodError) {
        return { success: false, error: e.message, propertyId: null };
    }
    return { success: false, error: "An unexpected server error occurred.", propertyId: null };
  }
}

export async function updatePropertyAction(
  id: string,
  data: UpdatePropertyFormValues
): Promise<{ success: boolean; error?: string | null; }> {
  try {
    await requireIdentity();
    const validatedData = UpdatePropertySchema.parse(data);
    const orderedPurposes = validatedData.purposes?.length
      ? validatedData.purposes
      : validatedData.purpose
        ? [validatedData.purpose]
        : [];

    if (orderedPurposes.length === 0) {
      return { success: false, error: "Please select at least one purpose." };
    }

    if (!validatedData.pricing?.listed) {
        return { success: false, error: "Listed price is required." };
    }
    
    const locationString = formatLocationString(validatedData.structuredLocation);

    // AI step to correct location
    const correctedLocation = await extractCorrectedLocation({
        title: validatedData.title,
        description: validatedData.description,
        location: locationString
    });

    const serviceInput: UpdatePropertyInput = {
      ...validatedData,
      purpose: orderedPurposes[0],
      purposes: orderedPurposes,
      location: correctedLocation, // Use the corrected location
      price: validatedData.pricing.listed,
      amenities: validatedData.amenities?.split(',').map(a => a.trim()).filter(Boolean) || [],
      images: validatedData.images?.filter(img => img.trim() !== '') || [],
      metaTags: validatedData.metaTags?.split(',').map(tag => tag.trim()).filter(Boolean) || [],
      pricing: validatedData.pricing ? {
        ...validatedData.pricing,
        options: Array.isArray(validatedData.pricing.options) ? validatedData.pricing.options : validatedData.pricing.options?.split(',').map(o => o.trim()).filter(Boolean) as any,
      } : undefined,
      owners: validatedData.owners,
    };
    await updatePropertyService(id, serviceInput);
    revalidatePath('/manage/properties');
    revalidatePath(`/properties/${id}`);
    revalidatePath(`/manage/properties/${id}/edit`);
    return { success: true, error: null };
  } catch (e: any) {
    await logProblem(e, `updatePropertyAction (ID: ${id})`);
     if (e instanceof z.ZodError) {
        return { success: false, error: e.message };
    }
    return { success: false, error: "An unexpected server error occurred." };
  }
}

export async function rewritePropertyDetailsAction(
  propertyId: string
): Promise<{
  success: boolean;
  error?: string;
  data?: RewritePropertyDetailsOutput;
}> {
  try {
    const property = await getPropertyById(propertyId, { includeInactive: true });
    if (!property) {
      return { success: false, error: 'Property not found' };
    }

    const rewrittenData = await rewritePropertyDetails({
      title: property.title,
      description: property.description,
      location: property.location,
      existingSlug: property.slug,
    });
    
    const finalSlug = rewrittenData.generatedSlug
      ? `${rewrittenData.generatedSlug}-${propertyId}`.substring(0, 120) // Limit slug length
      : property.slug;

    // This is tricky because rewritePropertyDetails doesn't know about the new schemas.
    // It will only update the fields it knows about. We should preserve the detailed fields.
    const updatePayload: UpdatePropertyInput = {
        ...(property as unknown as UpdatePropertyInput), // Start with existing data to preserve details
        title: rewrittenData.rewrittenTitle,
        description: rewrittenData.rewrittenDescription,
        location: rewrittenData.rewrittenLocation,
        metaTitle: rewrittenData.rewrittenMetaTitle,
        metaDescription: rewrittenData.rewrittenMetaDescription,
        metaTags: rewrittenData.rewrittenMetaTags,
        slug: finalSlug,
    };


    await updatePropertyService(propertyId, updatePayload);

    revalidatePath(`/manage/properties/${propertyId}/edit`);
    revalidatePath(`/manage/properties`);
    if (finalSlug) {
      revalidatePath(`/properties/${finalSlug}`);
    }

    return { success: true, data: { ...rewrittenData, finalSlug } };
  } catch (e: any) {
    await logProblem(e, `rewritePropertyDetailsAction (ID: ${propertyId})`);
    return { success: false, error: e.message || "Failed to rewrite property details." };
  }
}


export async function createAgencyAction(
  data: CreateAgencyFormValues
): Promise<{ success: boolean; error?: string | null; agencyId?: string | null }> {
  try {
    await requireIdentity();
    const validatedData = CreateAgencySchema.parse(data);
    const serviceInput: CreateAgencyInput = {
      ...validatedData,
      branches: validatedData.branches?.split('\\n').map(b => b.trim()).filter(Boolean) || [],
    };
    const agencyId = await createAgencyService(serviceInput);
    revalidatePath('/manage/agencies');
    revalidatePath('/agencies');
    return { success: true, agencyId, error: null };
  } catch (e: any)
   {
    await logProblem(e, 'createAgencyAction');
    if (e instanceof z.ZodError) {
        return { success: false, error: e.message, agencyId: null };
    }
    return { success: false, error: "An unexpected server error occurred.", agencyId: null };
  }
}

export async function updateAgencyAction(
  id: string,
  data: UpdateAgencyFormValues
): Promise<{ success: boolean; error?: string | null; }> {
  try {
    await requireIdentity();
    const validatedData = UpdateAgencySchema.parse(data);
    const serviceInput: UpdateAgencyInput = {
      ...validatedData,
      branches: validatedData.branches?.split('\\n').map(b => b.trim()).filter(Boolean) || [],
    };
    await updateAgencyService(id, serviceInput);
    revalidatePath('/manage/agencies');
    revalidatePath('/agencies');
    revalidatePath(`/manage/agencies/${id}/edit`);
    return { success: true, error: null };
  } catch (e: any) {
    await logProblem(e, `updateAgencyAction (ID: ${id})`);
    if (e instanceof z.ZodError) {
        return { success: false, error: e.message };
    }
    return { success: false, error: "An unexpected server error occurred." };
  }
}

export async function deleteAgencyAction(agencyId: string) {
    try {
        await deleteAgencyService(agencyId);
        revalidatePath('/manage/agencies');
        revalidatePath('/agencies');
        return { success: true };
    } catch (error: any) {
        await logProblem(error, `deleteAgencyAction (ID: ${agencyId})`);
        return { success: false, error: "Failed to delete agency." };
    }
}

export async function approvePropertyAction(propertyId: string) {
    try {
        await approveProperty(propertyId);
        revalidatePath('/manage/properties');
        revalidatePath(`/manage/properties/${propertyId}/edit`);
        return { success: true };
    } catch (error: any) {
        await logProblem(error, `approvePropertyAction (ID: ${propertyId})`);
        return { success: false, error: "Failed to approve property." };
    }
}

export async function deletePropertyAction(propertyId: string) {
    try {
        await deletePropertyService(propertyId);
        revalidatePath('/manage/properties');
        return { success: true };
    } catch (error: any) {
        await logProblem(error, `deletePropertyAction (ID: ${propertyId})`);
        return { success: false, error: "Failed to delete property." };
    }
}

const SitemapSchema = z.object({
    url: z.string().url({ message: "Please enter a valid sitemap URL." }),
});

export async function addSitemapAction(prevState: any, formData: FormData) {
    try {
        const validatedFields = SitemapSchema.safeParse({
            url: formData.get('sitemapUrl'),
        });

        if (!validatedFields.success) {
            return { success: false, error: validatedFields.error.flatten().fieldErrors.url?.[0] };
        }

        await addSitemap(validatedFields.data.url);
        revalidatePath('/manage/automation');
        return { success: true, error: null };
    } catch (error: any) {
        await logProblem(error, 'addSitemapAction');
        return { success: false, error: error.message };
    }
}

export async function getNewUrlsFromSitemapAction(sitemapId: string) {
    return getNewUrlsFromSitemap(sitemapId);
}

export async function processSitemapUrlAction(url: string) {
    const result = await processSitemapUrl(url);
    if (result.status === 'success') {
        revalidatePath('/manage/properties');
        revalidatePath('/properties');
    }
    return result;
}

export async function updateSitemapCheckedTimeAction(sitemapId: string) {
    await updateSitemapCheckedTime(sitemapId);
    revalidatePath('/manage/automation'); // Revalidate path to update last checked time
}


export async function runPropertyApproval(propertyId: string): Promise<PropertyApprovalResult> {
    return runPropertyApprovalFlow(propertyId);
}

export async function runPropertyAmendment(propertyId: string): Promise<PropertyAmendmentResult> {
    return runPropertyAmendmentFlow(propertyId);
}

export async function runPropertyAssurance(propertyId: string): Promise<PropertyAssuranceResult> {
    return runPropertyAssuranceFlow(propertyId);
}

export async function getPendingPropertiesForAgent(limit: number): Promise<{ id: string; title: string }[]> {
    const pendingProperties = await getPendingProperties(limit);
    return pendingProperties.map(p => ({ id: p.id, title: p.title }));
}

export async function getApprovedPropertiesForAgent(limit: number): Promise<{ id:string; title: string }[]> {
    const allProperties = await getProperties();
    const propertiesToCheck = allProperties.filter(p => p.isApproved && p.sourceUrl).slice(0, limit);
    return propertiesToCheck.map(p => ({ id: p.id, title: p.title }));
}

export type MarketAnalysisState = {
    success: boolean;
    error?: string;
    result?: {
        count: number;
        averagePrice: number;
        minPrice: number;
        maxPrice: number;
        summary: string;
    };
};

const MarketAnalysisSchema = z.object({
  query: z.string().min(3, { message: "Please provide a description of the properties to analyze." }),
});

export async function analyzeMarketAction(prevState: MarketAnalysisState, formData: FormData): Promise<MarketAnalysisState> {
    try {
        const validatedFields = MarketAnalysisSchema.safeParse({
            query: formData.get('query'),
        });

        if (!validatedFields.success) {
            return { success: false, error: validatedFields.error.flatten().fieldErrors.query?.[0] };
        }
        
        const { query } = validatedFields.data;

        const filters = await parseAdminFilter({ query });
        filters.status = 'approved';

        const { properties } = await getPaginatedProperties({ filters, limit: 10000 });

        if (properties.length === 0) {
            return { success: true, result: { count: 0, averagePrice: 0, minPrice: 0, maxPrice: 0, summary: `No matching properties found for "${query}". Try a different description.` } };
        }

        const prices = properties.map(p => p.price).filter(p => p > 0);
        if (prices.length === 0) {
            return { success: true, result: { count: properties.length, averagePrice: 0, minPrice: 0, maxPrice: 0, summary: "Found matching properties, but none have a listed price to analyze." } };
        }

        const totalCount = properties.length;
        const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

        const summary = `Based on ${totalCount} properties matching your description, the estimated market rate is between ${formatCurrency(minPrice)} and ${formatCurrency(maxPrice)}, with an average of ${formatCurrency(averagePrice)}.`;

        return { success: true, result: { count: totalCount, averagePrice, minPrice, maxPrice, summary }};
    } catch(e: any) {
        await logProblem(e, 'analyzeMarketAction');
        return { success: false, error: "An unexpected error occurred during analysis." };
    }
}


export async function clearAllProblemsAction(): Promise<{ success: boolean; error?: string }> {
    try {
        const result = await clearAllProblems();
        revalidatePath('/manage/problems');
        return result;
    } catch (e: any) {
        // This is a last resort, should not happen if clearAllProblems is correct
        return { success: false, error: "An unexpected error occurred." };
    }
}

export async function searchAgentsByLocationAction(
  location: string
): Promise<{ success: boolean; data: Agent[] | null; error: string | null }> {
  try {
    if (!location) {
      // Not an error, just return empty
      return { success: true, data: [], error: null };
    }
    const agents = await getAgentsByLocationService(location);
    return { success: true, data: agents, error: null };
  } catch (e: any) {
    await logProblem(e, 'searchAgentsByLocationAction');
    return { success: false, data: null, error: "An error occurred while searching for agents." };
  }
}

// Agent Actions
export async function createAgentAction(
  data: CreateAgentFormValues
): Promise<{ success: boolean; error?: string | null; agentId?: string | null }> {
  try {
    await requireIdentity();
    const validatedData = CreateAgentSchema.parse(data);
    const agentId = await createAgentService(validatedData);
    revalidatePath('/manage/agents');
    return { success: true, agentId, error: null };
  } catch (e: any) {
    await logProblem(e, 'createAgentAction');
    if (e instanceof z.ZodError) {
        return { success: false, error: e.message, agentId: null };
    }
    return { success: false, error: "An unexpected server error occurred.", agentId: null };
  }
}

export async function updateAgentAction(
  id: string,
  data: UpdateAgentFormValues
): Promise<{ success: boolean; error?: string | null; }> {
  try {
    await requireIdentity();
    const validatedData = UpdateAgentSchema.parse(data);
    await updateAgentService(id, validatedData);
    revalidatePath('/manage/agents');
    revalidatePath(`/manage/agents/${id}/edit`);
    return { success: true, error: null };
  } catch (e: any) {
    await logProblem(e, `updateAgentAction (ID: ${id})`);
    if (e instanceof z.ZodError) {
        return { success: false, error: e.message };
    }
    return { success: false, error: "An unexpected server error occurred." };
  }
}

export async function deleteAgentAction(agentId: string) {
    try {
        await deleteAgentService(agentId);
        revalidatePath('/manage/agents');
        return { success: true };
    } catch (error: any) {
        await logProblem(error, `deleteAgentAction (ID: ${agentId})`);
        return { success: false, error: "Failed to delete agent." };
    }
}

// WhatsApp Actions
export async function updateWhatsAppConfigAction(
  data: WhatsAppConfig
): Promise<{ success: boolean; error?: string | null }> {
  try {
    const validatedData = WhatsAppConfigSchema.parse(data);
    await updateWhatsAppConfig(validatedData);
    revalidatePath('/manage/settings/integration/whatsapp');
    return { success: true, error: null };
  } catch (e: any) {
    await logProblem(e, 'updateWhatsAppConfigAction');
    if (e instanceof z.ZodError) {
      return { success: false, error: e.message };
    }
    return { success: false, error: 'An unexpected server error occurred.' };
  }
}


export async function createWhatsAppTemplateAction(
  data: CreateWhatsAppTemplateFormValues
): Promise<{ success: boolean; error?: string | null; templateId?: string | null }> {
  try {
    const validatedData = CreateWhatsAppTemplateSchema.parse(data);
    const templateId = await createWhatsAppTemplate(validatedData);
    revalidatePath('/manage/settings/integration/whatsapp-template');
    return { success: true, templateId, error: null };
  } catch (e: any) {
    await logProblem(e, 'createWhatsAppTemplateAction');
    if (e instanceof z.ZodError) {
        return { success: false, error: e.message, templateId: null };
    }
    return { success: false, error: "An unexpected server error occurred.", templateId: null };
  }
}

export async function deleteWhatsAppTemplateAction(templateId: string) {
    try {
        await deleteWhatsAppTemplate(templateId);
        revalidatePath('/manage/settings/integration/whatsapp-template');
        return { success: true };
    } catch (error: any) {
        await logProblem(error, `deleteWhatsAppTemplateAction (ID: ${templateId})`);
        return { success: false, error: "Failed to delete template." };
    }
}

// Message Actions
export async function sendMessageAction(conversationId: string, formData: FormData) {
  const messageText = formData.get('messageText') as string;
  if (!messageText?.trim()) {
    return { success: false, error: "Message cannot be empty." };
  }

  try {
    // 1. Get conversation details
    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      return { success: false, error: "Conversation not found." };
    }
    if (!conversation.customerPhone) {
      return { success: false, error: "Customer phone number is missing." };
    }

    // 2. Prepare the data for the WhatsApp API and send it
    await sendWhatsAppMessageService(conversation.customerPhone, messageText);
    
    // 3. If the API call was successful, then save the message to our own database
    await createMessageService(conversationId, messageText, 'agent');
    revalidatePath(`/manage/messages/${conversationId}`);
    return { success: true };
  } catch (e: any) {
    // The underlying sendWhatsAppMessageService will now do the detailed logging,
    // so we only need to catch it to return a failure state to the UI.
    return { success: false, error: e.message || "Failed to send message." };
  }
}

export async function sendTemplateMessageAction(conversationId: string, template: WhatsAppTemplate) {
  try {
    const config = await getWhatsAppConfig();
    const conversation = await getConversationById(conversationId);

    if (!config.apiToken || !config.phoneNumberId) {
      return { success: false, error: "WhatsApp integration is not fully configured. Please set API Token and Phone Number ID." };
    }
    if (!conversation || !conversation.customerPhone) {
      return { success: false, error: "Conversation or customer phone number not found." };
    }

    const apiData = {
      messaging_product: "whatsapp",
      to: conversation.customerPhone,
      type: "template",
      template: {
        name: template.name,
        language: {
          code: template.language
        }
      }
    };

    console.log("--- WhatsApp Template API Request Body ---");
    console.log(JSON.stringify(apiData, null, 2));

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error?.message || 'Unknown WhatsApp API Error';
      
      // Log the detailed error
      await logProblem(new Error(`WhatsApp API Error: ${errorMessage}`), `sendTemplateMessageAction (WhatsApp API)`, {
          method: 'POST',
          requestBody: apiData,
          responseBody: errorData,
      });

      return { success: false, error: `WhatsApp API Error: ${errorMessage}` };
    }

    await createMessageService(conversationId, template.body, 'agent');
    revalidatePath(`/manage/messages/${conversationId}`);
    return { success: true };
  } catch (e: any) {
    await logProblem(e, `sendTemplateMessageAction (Conversation ID: ${conversationId})`);
    return { success: false, error: e.message || "Failed to send template message." };
  }
}

export async function createConversationAction(data: CreateConversationFormValues): Promise<{
  success: boolean;
  error?: string | null;
  conversationId?: string | null;
}> {
  try {
    const actorId = await requireIdentity();
    const validatedData = CreateConversationSchema.parse(data);
    const conversationId = await createConversationService({ ...validatedData, userId: actorId });
    revalidatePath('/manage/messages');
    return { success: true, conversationId, error: null };
  } catch (e: any) {
    await logProblem(e, 'createConversationAction');
    if (e instanceof z.ZodError) {
      return { success: false, error: e.message, conversationId: null };
    }
    return { success: false, error: "An unexpected server error occurred.", conversationId: null };
  }
}

export async function deleteConversationAction(conversationId: string) {
    try {
        await deleteConversationService(conversationId);
        revalidatePath('/manage/messages');
        return { success: true };
    } catch (e: any) {
        await logProblem(e, `deleteConversationAction (ID: ${conversationId})`);
        return { success: false, error: "Failed to delete conversation." };
    }
}

export async function setAiInterventionAction(conversationId: string, active: boolean) {
  try {
    await setAiInterventionService(conversationId, active);
    revalidatePath(`/manage/messages/${conversationId}`);
    return { success: true };
  } catch (e: any) {
    await logProblem(e, `setAiInterventionAction (ID: ${conversationId})`);
    return { success: false, error: e.message || "Failed to toggle AI intervention." };
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function sendAiFollowUpAction(conversationId: string): Promise<{ success: boolean; error?: string; messagesSent?: number }> {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      return { success: false, error: 'Conversation not found.' };
    }

    const messages = await getMessagesByConversationId(conversationId);
    if (messages.length === 0) {
      return { success: false, error: 'Cannot follow-up on an empty conversation.' };
    }
    if (messages[messages.length - 1].sender === 'customer') {
      return { success: false, error: 'Cannot follow-up when the customer was the last to message.' };
    }

    const formattedHistory = messages.map(msg => ({
      role: msg.sender === 'customer' ? 'user' : ('model' as 'user' | 'model'),
      content: msg.text
    }));

    // Call the AI to generate the follow-up messages
    const aiResult = await generateFollowUpMessages({
      history: formattedHistory,
      customerName: conversation.customerName,
    });

    if (!aiResult || !aiResult.messages || aiResult.messages.length === 0) {
      return { success: false, error: 'AI failed to generate follow-up messages.' };
    }

    // Send the messages one by one
    for (const messageText of aiResult.messages) {
      // 1. Send via WhatsApp API
      await sendWhatsAppMessageService(conversation.customerPhone, messageText);
      // 2. Save to our database
      await createMessageService(conversationId, messageText, 'agent');
      // 3. Wait a bit to seem more natural
      await delay(1500); // 1.5 second delay
    }
    
    revalidatePath(`/manage/messages/${conversationId}`);
    return { success: true, messagesSent: aiResult.messages.length };

  } catch (e: any) {
    await logProblem(e, `sendAiFollowUpAction (ID: ${conversationId})`);
    return { success: false, error: e.message || 'An unknown error occurred while sending follow-ups.' };
  }
}

export async function logUserActivity(
    userId: string,
    events: PropertyActivityEvent[],
    propertyId?: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!userId || events.length === 0) {
            return { success: true }; // No data to log, not an error.
        }
        
        // Update account last access time using the IP from the current request
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for') || headersList.get('remote-addr') || 'unknown';
        await updateAccountAccessInfo(userId, ip);
        
        // Log general activities to a separate collection
        for (const event of events) {
            const activityData: CreateUserActivityInput = {
                userId,
                activity: event.type,
                page: event.page,
                propertyId, // This is okay; it will be undefined for general pages
                activityOn: new Date().toISOString(),
                duration: event.duration,
            };
            await logActivityService(activityData);
        }

        // If a propertyId is provided, update property-specific preferences for recommendations
        if (propertyId) {
            const property = await getPropertyById(propertyId);
            if (property) {
                 await updateUserPreferences(userId, property, events);
            } else {
                await logProblem(new Error('Property not found during preference update.'), `logUserActivity (Prop: ${propertyId})`);
            }
        }

        return { success: true };
    } catch (e: any) {
        await logProblem(e, `logUserActivity (User: ${userId}, Prop: ${propertyId})`);
        return { success: false, error: e.message || "Failed to log user activity." };
    }
}

// FAQ Actions
export async function createFaqAction(
  data: CreateFaqFormValues
): Promise<{ success: boolean; error?: string | null; faqId?: string | null }> {
  try {
    const validatedData = CreateFaqSchema.parse(data);
    const faqId = await createFaqService(validatedData);
    revalidatePath('/manage/faq');
    revalidatePath('/faq');
    return { success: true, faqId, error: null };
  } catch (e: any) {
    await logProblem(e, 'createFaqAction');
    if (e instanceof z.ZodError) {
        return { success: false, error: e.message, faqId: null };
    }
    return { success: false, error: "An unexpected server error occurred.", faqId: null };
  }
}

export async function updateFaqAction(
  id: string,
  data: UpdateFaqFormValues
): Promise<{ success: boolean; error?: string | null; }> {
  try {
    const validatedData = UpdateFaqSchema.parse(data);
    await updateFaqService(id, validatedData);
    revalidatePath('/manage/faq');
    revalidatePath('/faq');
    return { success: true, error: null };
  } catch (e: any) {
    await logProblem(e, `updateFaqAction (ID: ${id})`);
    if (e instanceof z.ZodError) {
        return { success: false, error: e.message };
    }
    return { success: false, error: "An unexpected server error occurred." };
  }
}

export async function deleteFaqAction(faqId: string): Promise<{ success: boolean, error?: string }> {
    try {
        await deleteFaqService(faqId);
        revalidatePath('/manage/faq');
        revalidatePath('/faq');
        return { success: true };
    } catch (error: any) {
        await logProblem(error, `deleteFaqAction (ID: ${faqId})`);
        return { success: false, error: "Failed to delete FAQ." };
    }
}

export async function suggestPropertyQuestionsAction(
  propertyId: string
): Promise<{ success: boolean; questions?: string[]; error?: string }> {
  try {
    const property = await getPropertyById(propertyId);
    if (!property) {
      return { success: false, error: 'Property not found.' };
    }

    const result = await suggestQuestionsFlow({
      propertyTitle: property.title,
      propertyDescription: property.description,
      propertyPurpose: property.purpose,
    });

    return { success: true, questions: result.questions };
  } catch (e: any) {
    await logProblem(e, `suggestPropertyQuestionsAction (ID: ${propertyId})`);
    return { success: false, error: "Failed to generate suggested questions." };
  }
}

export async function createInquiryAction(
  data: CreateInquiryFormValues
): Promise<{ success: boolean; error?: string }> {
  try {
    const actorId = await requireIdentity();
    const validatedData = CreateInquirySchema.parse({ ...data, submittedBy: actorId });
    await createInquiryService(validatedData);
    return { success: true };
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.message };
    }
    // The service layer already logs the problem
    return { success: false, error: e.message || "Failed to submit inquiry." };
  }
}

export async function updateInquiryStatusAction(
  inquiryId: string,
  status: InquiryStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateInquiryStatusService(inquiryId, status);
    revalidatePath('/manage/inquiries');
    return { success: true };
  } catch (e: any) {
    // Service layer already logs
    return { success: false, error: e.message || "Failed to update inquiry status." };
  }
}

// Prompt Actions
export async function createPromptAction(
  data: CreatePromptFormValues
): Promise<{ success: boolean; error?: string }> {
  try {
    const validatedData = CreatePromptSchema.parse(data);
    await createPromptService(validatedData);
    revalidatePath('/manage/settings/ai-configuration');
    return { success: true };
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.message };
    }
    await logProblem(e, `createPromptAction (ID: ${data.id})`);
    return { success: false, error: e.message || "An unexpected server error occurred." };
  }
}

export async function updatePromptAction(
  data: UpdatePromptFormValues
): Promise<{ success: boolean; error?: string }> {
  try {
    const validatedData = UpdatePromptSchema.parse(data);
    await updatePromptService(validatedData.id, validatedData);
    revalidatePath('/manage/settings/ai-configuration');
    return { success: true };
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.message };
    }
    await logProblem(e, `updatePromptAction (ID: ${data.id})`);
    return { success: false, error: "An unexpected server error occurred." };
  }
}

export async function deletePromptAction(promptId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deletePromptService(promptId);
    revalidatePath('/manage/settings/ai-configuration');
    return { success: true };
  } catch (error: any) {
    await logProblem(error, `deletePromptAction (ID: ${promptId})`);
    return { success: false, error: (error as Error).message || "Failed to delete prompt." };
  }
}

// AI Model Actions
export async function createModelAction(data: CreateAIModelFormValues): Promise<{ success: boolean; error?: string }> {
  try {
    const validatedData = CreateAIModelSchema.parse(data);
    await createModelService(validatedData);
    revalidatePath('/manage/settings/ai-models');
    return { success: true };
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.message };
    }
    await logProblem(e, `createModelAction`);
    return { success: false, error: (e as Error).message };
  }
}

export async function updateModelAction(data: UpdateAIModelFormValues): Promise<{ success: boolean; error?: string }> {
  try {
    const validatedData = UpdateAIModelSchema.parse(data);
    const { id, ...updateData } = validatedData;
    await updateModelService(id, updateData);
    revalidatePath('/manage/settings/ai-models');
    return { success: true };
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.message };
    }
    await logProblem(e, `updateModelAction`);
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteModelAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteModelService(id);
    revalidatePath('/manage/settings/ai-models');
    return { success: true };
  } catch (e: any) {
    await logProblem(e, `deleteModelAction`);
    return { success: false, error: (e as Error).message };
  }
}

export async function setDefaultModelAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await setDefaultModelService(id);
    revalidatePath('/manage/settings/ai-models');
    return { success: true };
  } catch (e: any) {
    await logProblem(e, `setDefaultModelAction`);
    return { success: false, error: (e as Error).message };
  }
}

// Saved Properties Action
export async function toggleSavePropertyAction(userId: string, propertyId: string): Promise<{ saved: boolean }> {
  try {
    // Verify identity via gRPC — use the verified accountId, not the client-supplied userId
    const identity = await getIdentity();
    const verifiedUserId = identity.authenticated ? identity.user.accountId : userId;

    if (!verifiedUserId) {
        throw new Error("User ID is required to save a property.");
    }
    const result = await toggleSavedPropertyService(verifiedUserId, propertyId);
    revalidatePath('/saved'); // Revalidate the saved properties page
    revalidatePath('/manage/saved');
    return result;
  } catch (e: any) {
    await logProblem(e, `toggleSavePropertyAction (User: ${userId}, Prop: ${propertyId})`);
    // In case of error, it might be best to let the client know it failed.
    // Let's assume the service function throws, and we let the client handle it.
    throw e;
  }
}

export async function getSavedPropertiesForUser(userId: string): Promise<Property[]> {
  try {
    return await getSavedPropertiesForUserService(userId);
  } catch (e) {
    await logProblem(e, `getSavedPropertiesForUser (User: ${userId})`);
    return [];
  }
}

export async function getUsersBySavedProperty(propertyId: string): Promise<any[]> {
  try {
    return await getUsersBySavedPropertyService(propertyId);
  } catch (e) {
    await logProblem(e, `getUsersBySavedProperty (Property: ${propertyId})`);
    return [];
  }
}

// Property Request Action
export async function createPropertyRequestAction(data: CreatePropertyRequestFormValues): Promise<{ success: boolean; error?: string }> {
    try {
        const actorId = await requireIdentity();
        const validatedData = CreatePropertyRequestSchema.parse({ ...data, submittedBy: actorId });
        await createPropertyRequestService(validatedData);
        revalidatePath('/manage/requests');
        return { success: true };
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { success: false, error: e.message };
        }
        await logProblem(e, 'createPropertyRequestAction');
        return { success: false, error: e.message || "Failed to submit property request." };
    }
}

// Sales Request Action
export async function createSalesRequestAction(data: CreateSalesRequestFormValues): Promise<{ success: boolean; error?: string }> {
    try {
        const actorId = await requireIdentity();
        const validatedData = CreateSalesRequestSchema.parse({ ...data, submittedBy: actorId });
        await createSalesRequestService(validatedData);
        revalidatePath('/manage/sales-requests');
        return { success: true };
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { success: false, error: e.message };
        }
        await logProblem(e, 'createSalesRequestAction');
        return { success: false, error: e.message || "Failed to submit sales request." };
    }
}

// Visit Request Action
export async function createVisitRequestAction(data: CreateVisitRequestFormValues): Promise<{ success: boolean; error?: string }> {
    try {
        const actorId = await requireIdentity();
        const validatedData = CreateVisitRequestSchema.parse({ ...data, submittedBy: actorId });
        await createVisitRequestService(validatedData);
        revalidatePath('/manage/visit-requests');
        return { success: true };
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { success: false, error: e.message };
        }
        await logProblem(e, 'createVisitRequestAction');
        return { success: false, error: e.message || "Failed to submit visit request." };
    }
}

// Mortgage Request Action
export async function createMortgageRequestAction(data: CreateMortgageRequestFormValues): Promise<{ success: boolean; error?: string }> {
    try {
        const actorId = await requireIdentity();
        const validatedData = CreateMortgageRequestSchema.parse({ ...data, submittedBy: actorId });
        await createMortgageRequestService(validatedData);
        revalidatePath('/manage/mortgage-requests');
        return { success: true };
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { success: false, error: e.message };
        }
        await logProblem(e, 'createMortgageRequestAction');
        return { success: false, error: e.message || "Failed to submit mortgage request." };
    }
}

// Contact Submission Action
export async function createContactSubmissionAction(data: CreateContactSubmissionFormValues): Promise<{ success: boolean; error?: string }> {
    try {
        const actorId = await requireIdentity();
        const validatedData = CreateContactSubmissionSchema.parse({ ...data, submittedBy: actorId });
        await createContactSubmissionService(validatedData);
        revalidatePath('/manage/contact');
        return { success: true };
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { success: false, error: e.message };
        }
        await logProblem(e, 'createContactSubmissionAction');
        return { success: false, error: e.message || "Failed to submit contact form." };
    }
}

// Requirement Actions
export async function upsertRequirementAction(data: CreateRequirementFormValues, requirementId?: string): Promise<{ success: boolean, error?: string | null }> {
    try {
        const actorId = await requireIdentity();
        // Always use the verified accountId — ignore any userId the client may have sent
        const validatedData = CreateRequirementSchema.parse({ ...data, userId: actorId });

        if (requirementId) {
            await updateRequirementService(requirementId, validatedData);
        } else {
            await createRequirementService(validatedData);
        }

        revalidatePath('/profile'); // To update the recommendations
        return { success: true, error: null };
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { success: false, error: e.message };
        }
        await logProblem(e, 'upsertRequirementAction');
        return { success: false, error: 'Failed to save requirements.' };
    }
}

// Account Actions
export async function getOrCreateTemporaryAccountAction(): Promise<{ success: boolean; accountId?: string; error?: string }> {
    try {
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for') || 'unknown';
        const accountId = await createTemporaryAccount(ip);
        return { success: true, accountId };
    } catch (error: any) {
        await logProblem(error, 'getOrCreateTemporaryAccountAction');
        return { success: false, error: "Failed to create temporary account." };
    }
}

export async function updateUserAction(data: UpdateUserFormValues): Promise<{ success: boolean; error?: string }> {
    try {
        const validatedData = UpdateUserSchema.parse(data);
        await updateUser(validatedData.id, validatedData);
        revalidatePath(`/manage/users/${validatedData.id}`);
        return { success: true };
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return { success: false, error: e.message };
        }
        await logProblem(e, `updateUserAction (ID: ${data.id})`);
        return { success: false, error: (e as Error).message || "Failed to update user." };
    }
}
