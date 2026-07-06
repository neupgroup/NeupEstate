

"use server";

import { naturalLanguagePropertySearch as naturalLanguagePropertySearchFlow } from "@/services/ai/natural-language-property-search";
import { recommendProperties as recommendPropertiesFlow } from "@/services/ai/ai-powered-recommendations";
import { extractAndSaveProperty as extractAndSavePropertyFlow, type ExtractPropertyDetailsOutput } from "@/services/ai/extract-property-details-flow";
import { createProperty as createPropertyService, updateProperty as updatePropertyService, approveProperty, getProperties, deleteProperty as deletePropertyService, getPendingProperties, getAwaitingReviewItems, getPaginatedProperties, getPropertyById, getPropertyReviewRequests, updatePropertyWithExtractedData, updatePropertyImages, toggleSavedProperty as toggleSavedPropertyService, getUsersBySavedProperty as getUsersBySavedPropertyService, getSavedPropertiesForUser as getSavedPropertiesForUserService, createPropertyLog } from '@/services/property-service';
import { createAgency as createAgencyService, updateAgency as updateAgencyService, deleteAgency as deleteAgencyService } from '@/services/agency-service';
import { createAgencyAgentMap as createAgencyAgentMapService, getAgencyAgentAccountsByAgency as getAgencyAgentAccountsByAgencyService, getAgencyAgentMaps, getAgencyAgentMapsByAgent as getAgencyAgentMapsByAgentService, getAgencyAgentMapsByAgency as getAgencyAgentMapsByAgencyService } from '@/services/agency-agent-map-service';
import { getAgentsByLocation as getAgentsByLocationService, createAgent as createAgentService, updateAgent as updateAgentService, deleteAgent as deleteAgentService } from '@/services/agent-service';
import { addSitemap, getNewUrlsFromSitemap, processSitemapUrl, updateSitemapCheckedTime } from "@/services/sitemap-service";
import { clearAllProblems } from "@/services/problem-service";
import { logProblem } from "@/services/problem-service";
import { clearSiteDevLogs } from "@/services/site-dev-log-service";
import type { NaturalLanguageSearchOutput, Property, CreatePropertyInput, UpdatePropertyInput, CreateAgencyInput, UpdateAgencyInput, PropertyApprovalResult, CreatePropertyFormValues, UpdatePropertyFormValues, CreateAgencyFormValues, UpdateAgencyFormValues, PropertyFilters, ExtractedPropertyData, SitemapLog, PropertyAmendmentResult, RewritePropertyDetailsOutput, PropertyAssuranceResult, Agent, CreateAgentFormValues, UpdateAgentFormValues, StructuredLocation, CreateWhatsAppTemplateFormValues, WhatsAppConfig, WhatsAppTemplate, CreateConversationFormValues, CreateUserActivityInput, PropertyImageUpdateResult, CreateFaqFormValues, UpdateFaqFormValues, CreateInquiryFormValues, InquiryStatus, UpdatePromptFormValues, CreatePromptFormValues, User, CreatePropertyRequestFormValues, CreateSalesRequestFormValues, CreateVisitRequestFormValues, CreateMortgageRequestFormValues, CreateContactSubmissionFormValues, PropertyActivityEvent, UserPreferences, AIModel, CreateAIModelFormValues, UpdateAIModelFormValues, CreateRequirementFormValues, Requirement, UpdateUserFormValues, LandDetails, PlotDetails, ApartmentUnit } from "@/types";
import { CreatePropertySchema, UpdatePropertySchema, CreateAgencySchema, UpdateAgencySchema, PropertyPurposeSchema, PropertyCategorySchema, PropertyUsageTypeSchema, CreateAgentSchema, UpdateAgentSchema, CreateWhatsAppTemplateSchema, WhatsAppConfigSchema, CreateConversationSchema, CreateFaqSchema, UpdateFaqSchema, CreateInquirySchema, UpdatePromptSchema, CreatePromptSchema, CreatePropertyRequestSchema, CreateSalesRequestSchema, CreateVisitRequestSchema, CreateMortgageRequestSchema, CreateContactSubmissionSchema, CreateAIModelSchema, UpdateAIModelSchema, CreateRequirementSchema, UpdateUserSchema, areaValueToSqft } from "@/types";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { runPropertyApproval as runPropertyApprovalFlow } from "@/services/ai/property-approval-flow";
import { runPropertyAmendment as runPropertyAmendmentFlow } from "@/services/ai/property-amendment-flow";
import { runPropertyAssurance as runPropertyAssuranceFlow } from "@/services/ai/property-assurance-flow";
import { rewritePropertyDetails } from "@/services/ai/rewrite-property-details-flow";
import { parseAdminFilter } from "@/services/ai/parse-admin-filter-flow";
import { getWhatsAppConfig, createWhatsAppTemplate, deleteWhatsAppTemplate, updateWhatsAppConfig, sendWhatsAppMessage as sendWhatsAppMessageService } from '@/services/whatsapp-service';
import { createMessage as createMessageService, createConversation as createConversationService, deleteConversation as deleteConversationService, getConversationById, getMessagesByConversationId, setAiIntervention as setAiInterventionService } from '@/services/conversation-service';
import { generateFollowUpMessages } from '@/services/ai/ai-follow-up-flow';
import { suggestQuestions as suggestQuestionsFlow } from '@/services/ai/suggest-questions-flow';
import { logActivity as logActivityService, updateAccountAccessInfo } from '@/services/activity-service';
import { updateUserPreferences, getUserPreferences } from '@/services/user-preference-service';
import { createFaq as createFaqService, updateFaq as updateFaqService, deleteFaq as deleteFaqService } from '@/services/faq-service';
import { updatePrompt as updatePromptService, createPrompt as createPromptService, deletePrompt as deletePromptService } from '@/services/prompt-service';
import { createPropertyRequest as createPropertyRequestService, createInquiry as createInquiryService, updateInquiryStatus as updateInquiryStatusService } from '@/services/property-request-service';
import { createSalesRequest as createSalesRequestService } from '@/services/sales-request-service';
import { createVisitRequest as createVisitRequestService } from '@/services/visit-request-service';
import { createMortgageRequest as createMortgageRequestService } from '@/services/mortgage-request-service';
import { createContactSubmission as createContactSubmissionService } from '@/services/contact-service';
import { createModel as createModelService, updateModel as updateModelService, deleteModel as deleteModelService, setDefaultModel as setDefaultModelService } from '@/services/model-service';
import { createRequirement as createRequirementService, updateRequirement as updateRequirementService } from '@/services/requirements-service';
import { createPropertyDraftRequest, editUncreatedPropertyDraftRequest } from '@/services/bridge-property-service';
import { resolveAccount, updateUser, getAccountById, getAccounts } from '@/services/account-service';
import { deleteAccountAndData } from '@/services/account-service';
import { createLead as createLeadService, createLeadActivity as createLeadActivityService } from '@/services/lead-service';
import { getIdentity } from '@/services/neupid/get-identity';
import { hasPermission, requirePermission } from '@/logica/auth/authorization';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { prisma } from '@/logica/core/prisma';
import { isAgencyLikeAccountType, promoteStoredAccountType } from '@/services/account-type';
import { resolvePropertyPostingContext } from '@/services/property-posting-context';

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
  return identity.account.accountId;
}

async function isAgencyAffiliatedAccount(accountId: string): Promise<boolean> {
  const [agencyMap, agencyRecord] = await Promise.all([
    prisma.agencyMap.findFirst({ where: { accountId } }),
    prisma.agency.findUnique({ where: { id: accountId } }),
  ]);

  return Boolean(agencyMap || agencyRecord);
}

/**
 * Public server action — safe to call from client components.
 * Returns the verified accountId, or null if the user is not authenticated.
 */
export async function getCurrentAccountId(): Promise<string | null> {
  const identity = await getIdentity();
  return identity.authenticated ? identity.account.accountId : null;
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

function firstPositivePrice(pricing?: CreatePropertyFormValues['pricing']): number {
  const direct = Number(pricing?.listed ?? 0);
  if (direct > 0) return direct;

  const prices = Object.values(pricing?.basisPrices ?? {})
    .map((value) => Number(value ?? 0))
    .filter((value) => value > 0);

  return prices[0] ?? 0;
}

function cleanPricing(pricing?: CreatePropertyFormValues['pricing']) {
  if (!pricing) return undefined;

  const cleanNumberMap = (map?: Record<string, number | undefined>): Record<string, number> | undefined => {
    const entries = Object.entries(map ?? {})
      .map(([key, value]) => [key, Number(value ?? 0)] as const)
      .filter(([, value]) => value > 0);
    return entries.length ? Object.fromEntries(entries) : undefined;
  };
  const cleanStringMap = (map?: Record<string, string | undefined>): Record<string, string> | undefined => {
    const entries = Object.entries(map ?? {}).filter((entry): entry is [string, string] => Boolean(entry[1]));
    return entries.length ? Object.fromEntries(entries) : undefined;
  };

  const basisPrices = cleanNumberMap(pricing.basisPrices);
  const basisNegotiablePrices = cleanNumberMap(pricing.basisNegotiablePrices);
  const activeBasis = new Set([
    ...Object.keys(basisPrices ?? {}),
    ...Object.keys(basisNegotiablePrices ?? {}),
  ]);
  const basisNegotiable = Object.fromEntries(
    Object.entries(pricing.basisNegotiable ?? {}).filter(([basis, value]) => value && activeBasis.has(basis)),
  );

  return {
    ...pricing,
    listed: pricing.listed && pricing.listed > 0 ? pricing.listed : undefined,
    basisPrices,
    basisNegotiable: Object.keys(basisNegotiable).length ? basisNegotiable : undefined,
    basisNegotiablePrices,
    basisFrequencies: cleanStringMap(pricing.basisFrequencies),
    basisUnits: cleanStringMap(pricing.basisUnits),
    options: Array.isArray(pricing.options) ? pricing.options : pricing.options?.split(',').map(o => o.trim()).filter(Boolean) as any,
  };
}

type PropertyChangeDraftStatus =
  | 'creation_draft'
  | 'creation_pending'
  | 'changing'
  | 'deleting';

function isPlainObject(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepMergeJson<T>(base: T, patch: any): T {
  if (!isPlainObject(base) || !isPlainObject(patch)) {
    return (patch === undefined ? base : patch) as T;
  }

  const merged: Record<string, any> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value === null) {
      delete merged[key];
      continue;
    }
    const current = merged[key];
    merged[key] = isPlainObject(current) && isPlainObject(value)
      ? deepMergeJson(current, value)
      : value;
  }

  return merged as T;
}

function normalizeArrayLikeValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, entry]) => entry)
    .filter((entry) => entry !== undefined);
}

function normalizeOwnerEntries(value: unknown): NonNullable<CreatePropertyInput['owners']> {
  return normalizeArrayLikeValue(value)
    .filter((entry): entry is Record<string, any> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({
      ownerClientId: typeof entry.ownerClientId === 'string' ? entry.ownerClientId.trim() : '',
      isPrimaryOwner: Boolean(entry.isPrimaryOwner),
      clientName: typeof entry.clientName === 'string' ? entry.clientName : undefined,
      clientEmail: typeof entry.clientEmail === 'string' ? entry.clientEmail : undefined,
      clientPhone: typeof entry.clientPhone === 'string' ? entry.clientPhone : undefined,
    }))
    .filter((entry) => entry.ownerClientId.length > 0) as NonNullable<CreatePropertyInput['owners']>;
}

function normalizeOwnerReferenceEntries(value: unknown): Array<{ id: string; isprimary: boolean }> {
  const rawEntries = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? [value]
      : [];

  return rawEntries
    .filter((entry): entry is Record<string, any> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => {
      const id = typeof entry.id === 'string'
        ? entry.id.trim()
        : typeof entry.ownerClientId === 'string'
          ? entry.ownerClientId.trim()
          : '';

      return {
        id,
        isprimary: Boolean(entry.isprimary ?? entry.isPrimaryOwner),
      };
    })
    .filter((entry) => entry.id.length > 0);
}

function normalizePropertyChangeData(data: Record<string, any>): Record<string, any> {
  const next = { ...data };
  for (const key of ['images', 'documents', 'plots', 'apartmentUnits']) {
    if (key in next) next[key] = normalizeArrayLikeValue(next[key]);
  }
  if ('owner' in next) {
    next.owner = normalizeOwnerReferenceEntries(next.owner);
  }
  if ('owners' in next) {
    next.owners = normalizeOwnerEntries(next.owners);
  }
  if ('listingAgentAccountId' in next) {
    next.listingAgentAccountId = typeof next.listingAgentAccountId === 'string'
      ? next.listingAgentAccountId.trim()
      : '';
  }
  if ('listingAgent' in next) {
    next.listingAgent = typeof next.listingAgent === 'string'
      ? next.listingAgent.trim()
      : '';
  }
  return next;
}

/*
::neup.documentation::property-create-draft-actions

::private

These actions persist the multi-step create form into `property_changes` before
submission so unfinished work can be resumed by explicit `changeId`. Partial
saves keep raw form-shaped data; final submission rewrites the same draft row
into the review-ready property payload.

::private end
::end
*/
export async function savePropertyCreateDraftAction(input: {
  changeId?: string | null;
  postingAgencyId?: string | null;
  workingProfileId?: string | null;
  data: Record<string, any>;
}): Promise<{ success: boolean; changeId?: string; propertyId?: string | null; error?: string }> {
  try {
    await requirePermission(PERMISSIONS.manage.propertySelfCreate);
    const actorId = await requireIdentity();
    const postingContext = await resolvePropertyPostingContext({
      actorAccountId: actorId,
      requestedWorkingProfileId: input.workingProfileId,
    });
    const requestedChangeId = input.changeId?.trim() || null;
    const draftStatusFilter = requestedChangeId
      ? { in: ['creation_draft', 'creation_pending', 'creating'] }
      : { in: ['creation_draft', 'creating'] };
    const existingDraft = requestedChangeId
      ? await prisma.propertyChange.findFirst({
          where: {
            id: requestedChangeId,
            accountId: actorId,
            status: draftStatusFilter,
            isApproved: null,
          },
          orderBy: { modifiedOn: 'desc' },
        })
      : null;

    const normalizedExistingData = existingDraft
      ? normalizePropertyChangeData((existingDraft.data ?? {}) as Record<string, any>)
      : {};
    const normalizedInputData = normalizePropertyChangeData({
      ...input.data,
      postingAgencyId: postingContext.postingAgencyId,
      createdById: postingContext.createdById,
      createdForId: postingContext.createdForId,
      workingProfileId: postingContext.workingProfileId,
      transferToId: postingContext.transferToId,
      created_by: postingContext.createdById,
      transfer_to: postingContext.transferToId,
      workingProfileType: postingContext.profileType,
    });
    const mergedData = existingDraft
      ? deepMergeJson(normalizedExistingData, normalizedInputData)
      : normalizedInputData;
    const draftPayload = {
      propertyId: existingDraft?.propertyId ?? null,
      accountId: actorId,
      createdById: postingContext.createdById,
      createdForId: postingContext.createdForId,
      workingProfileId: postingContext.workingProfileId,
      status: existingDraft?.status === 'creation_pending'
        ? 'creation_pending' as const
        : 'creation_draft' as const,
      isApproved: null,
      data: mergedData,
      modifiedOn: new Date(),
    };

    const draft = existingDraft
      ? await prisma.propertyChange.update({
          where: { id: existingDraft.id },
          data: draftPayload,
        })
      : await prisma.propertyChange.create({ data: draftPayload });

    return { success: true, changeId: draft.id, propertyId: draft.propertyId };
  } catch (e: any) {
    await logProblem(e, 'savePropertyCreateDraftAction');
    return { success: false, error: e.message || 'Failed to save property draft.' };
  }
}

export async function getCurrentPropertyCreateDraftAction(changeId?: string | null): Promise<{
  success: boolean;
  changeId?: string;
  data?: Record<string, any>;
  postingAgencyId?: string | null;
  propertyId?: string | null;
  error?: string;
}> {
  try {
    await requirePermission(PERMISSIONS.manage.propertySelfCreate);
    const actorId = await requireIdentity();
    const requestedChangeId = changeId?.trim() || null;
    const draftStatusFilter = requestedChangeId
      ? { in: ['creation_draft', 'creation_pending', 'creating'] }
      : { in: ['creation_draft', 'creating'] };
    const draft = requestedChangeId
      ? await prisma.propertyChange.findFirst({
          where: {
            id: requestedChangeId,
            accountId: actorId,
            status: draftStatusFilter,
            isApproved: null,
          },
          orderBy: { modifiedOn: 'desc' },
        })
      : null;

    if (!draft) {
      return { success: true };
    }

    const normalizedData = normalizePropertyChangeData((draft.data ?? {}) as Record<string, any>);
    return {
      success: true,
      changeId: draft.id,
      data: normalizedData,
      postingAgencyId: typeof normalizedData.postingAgencyId === 'string'
        ? normalizedData.postingAgencyId
        : null,
      propertyId: draft.propertyId,
    };
  } catch (e: any) {
    await logProblem(e, `getCurrentPropertyCreateDraftAction ${changeId ?? 'latest'}`);
    return { success: false, error: e.message || 'Failed to load property draft.' };
  }
}

export async function savePropertyChangeDraftAction(input: {
  propertyId: string;
  data: Record<string, any>;
  status: PropertyChangeDraftStatus;
  isApproved?: boolean | null;
}): Promise<{ success: boolean; changeId?: string; error?: string }> {
  try {
    await requirePermission(PERMISSIONS.manage.propertySelfUpdate);
    if ('owners' in input.data || 'listingAgentAccountId' in input.data || 'listingAgent' in input.data) {
      const canTransferOwnership = await hasPermission(PERMISSIONS.manage.propertySelfTransfer);
      if (!canTransferOwnership) {
        return { success: false, error: 'You do not have permission to edit listing ownership details.' };
      }
    }
    const actorId = await requireIdentity();
    const existingDraft = await prisma.propertyChange.findFirst({
      where: {
        propertyId: input.propertyId,
        accountId: actorId,
        isApproved: null,
      },
      orderBy: { modifiedOn: 'desc' },
    });

    const normalizedExistingData = existingDraft ? normalizePropertyChangeData((existingDraft.data ?? {}) as Record<string, any>) : {};
    const normalizedInputData = normalizePropertyChangeData(input.data);
    if (input.status === 'changing' && Object.keys(normalizedInputData).length === 0) {
      if (existingDraft && Object.keys(normalizedExistingData).length === 0) {
        await prisma.propertyChange.delete({ where: { id: existingDraft.id } });
        revalidatePath(`/manage/properties/${input.propertyId}`);
        return { success: true };
      }

      return { success: true, changeId: existingDraft?.id };
    }

    const mergedData = existingDraft
      ? deepMergeJson(normalizedExistingData, normalizedInputData)
      : normalizedInputData;
    if (input.status === 'changing' && Object.keys(mergedData).length === 0) {
      if (existingDraft) {
        await prisma.propertyChange.delete({ where: { id: existingDraft.id } });
        revalidatePath(`/manage/properties/${input.propertyId}`);
      }
      return { success: true };
    }

    const data = {
      propertyId: input.propertyId,
      accountId: actorId,
      status: input.status,
      isApproved: input.isApproved ?? existingDraft?.isApproved ?? null,
      data: mergedData,
      modifiedOn: new Date(),
    };

    const draft = existingDraft
      ? await prisma.propertyChange.update({
          where: { id: existingDraft.id },
          data,
        })
      : await prisma.propertyChange.create({ data });

    return { success: true, changeId: draft.id };
  } catch (e: any) {
    await logProblem(e, 'savePropertyChangeDraftAction');
    return { success: false, error: e.message || 'Failed to save property draft.' };
  }
}

export async function getPropertyEditCapabilitiesAction(): Promise<{
  success: boolean;
  canEditOwnership: boolean;
}> {
  try {
    await requirePermission(PERMISSIONS.manage.propertySelfUpdate);
    return {
      success: true,
      canEditOwnership: await hasPermission(PERMISSIONS.manage.propertySelfTransfer),
    };
  } catch (error) {
    await logProblem(error, 'getPropertyEditCapabilitiesAction');
    return {
      success: false,
      canEditOwnership: false,
    };
  }
}

export async function getListingAgentOptionsAction(input: {
  agencyId?: string | null;
  currentAgentId?: string | null;
}): Promise<{
  success: boolean;
  agents: Array<{ id: string; name: string; imageUrl: string | null; agencyId: string | null; agencyName: string | null }>;
}> {
  try {
    await requirePermission(PERMISSIONS.manage.propertySelfUpdate);
    const actorId = await requireIdentity();
    const canEditOwnership = await hasPermission(PERMISSIONS.manage.propertySelfTransfer);

    if (!canEditOwnership) {
      return { success: true, agents: [] };
    }

    const accounts = await getAccounts();
    const accountById = new Map(accounts.map((account) => [account.id, account]));
    const agencyLinks = await getAgencyAgentMaps();
    const primaryAgencyByAgentId = new Map<string, { agencyId: string; agencyName: string | null }>();

    for (const link of agencyLinks) {
      if (link.status !== 'accepted' || primaryAgencyByAgentId.has(link.agentId)) continue;
      const agencyAccount = accountById.get(link.agencyId);
      primaryAgencyByAgentId.set(link.agentId, {
        agencyId: link.agencyId,
        agencyName: agencyAccount?.display_name?.trim() || agencyAccount?.id || link.agencyId,
      });
    }

    const optionMap = new Map<string, {
      name: string;
      imageUrl: string | null;
      priority: number;
      agencyId: string | null;
      agencyName: string | null;
    }>();

    if (input.agencyId?.trim()) {
      const agencyAgents = await getAgencyAgentAccountsByAgencyService(input.agencyId.trim());
      for (const account of agencyAgents) {
        const agencyContext = primaryAgencyByAgentId.get(account.id);
        optionMap.set(account.id, {
          name: account.display_name?.trim() || account.id,
          imageUrl: account.display_image?.trim() || null,
          priority: 0,
          agencyId: agencyContext?.agencyId ?? null,
          agencyName: agencyContext?.agencyName ?? null,
        });
      }
    }

    for (const account of accounts) {
      if (
        ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(account.account_type) ||
        account.account_type === 'guest'
      ) continue;
      if (optionMap.has(account.id)) continue;
      const agencyContext = primaryAgencyByAgentId.get(account.id);
      optionMap.set(account.id, {
        name: account.display_name?.trim() || account.id,
        imageUrl: account.display_image?.trim() || null,
        priority: 1,
        agencyId: agencyContext?.agencyId ?? null,
        agencyName: agencyContext?.agencyName ?? null,
      });
    }

    for (const accountId of [input.currentAgentId?.trim(), actorId]) {
      if (!accountId) continue;
      const existing = optionMap.get(accountId);
      if (existing) {
        optionMap.set(accountId, { ...existing, priority: Math.min(existing.priority, 0) });
        continue;
      }
      const account = await getAccountById(accountId);
      if (
        account &&
        !['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(account.account_type) &&
        account.account_type !== 'guest'
      ) {
        const agencyContext = primaryAgencyByAgentId.get(account.id);
        optionMap.set(account.id, {
          name: account.display_name?.trim() || account.id,
          imageUrl: account.display_image?.trim() || null,
          priority: 0,
          agencyId: agencyContext?.agencyId ?? null,
          agencyName: agencyContext?.agencyName ?? null,
        });
      }
    }

    return {
      success: true,
      agents: Array.from(optionMap.entries())
        .map(([id, meta]) => ({
          id,
          name: meta.name,
          imageUrl: meta.imageUrl,
          priority: meta.priority,
          agencyId: meta.agencyId,
          agencyName: meta.agencyName,
        }))
        .sort((left, right) => {
          if (left.priority !== right.priority) return left.priority - right.priority;
          return left.name.localeCompare(right.name);
        })
        .map(({ id, name, imageUrl, agencyId, agencyName }) => ({ id, name, imageUrl, agencyId, agencyName })),
    };
  } catch (error) {
    await logProblem(error, 'getListingAgentOptionsAction');
    return { success: false, agents: [] };
  }
}

export async function getPropertyChangeDraftAction(changeId: string): Promise<{
  success: boolean;
  data?: Record<string, any>;
  status?: string;
  isApproved?: boolean | null;
  propertyId?: string | null;
  error?: string;
}> {
  try {
    const draft = await prisma.propertyChange.findUnique({ where: { id: changeId } });
    if (!draft) return { success: false, error: 'Draft not found.' };
    await requirePermission(
      PERMISSIONS.manage.propertySelfUpdate,
    );

    if (draft.isApproved !== null) {
      return {
        success: true,
        data: undefined,
        status: draft.status,
        isApproved: draft.isApproved,
        propertyId: draft.propertyId,
      };
    }

    return {
      success: true,
      data: normalizePropertyChangeData(draft.data as Record<string, any>),
      status: draft.status,
      isApproved: draft.isApproved,
      propertyId: draft.propertyId,
    };
  } catch (e: any) {
    await logProblem(e, `getPropertyChangeDraftAction ${changeId}`);
    return { success: false, error: e.message || 'Failed to load property draft.' };
  }
}

export async function getPropertyChangeContextAction(propertyId: string): Promise<{
  success: boolean;
  currentUserChange?: {
    id: string;
    status: string;
    isApproved: boolean | null;
    data: Record<string, any>;
    modifiedOn: string;
    accountId: string;
  } | null;
  recentActivity?: {
    hasCurrentUserChangeInLast7Days: boolean;
    hasOtherUserChangeInLast7Days: boolean;
    latestOutcome?: 'accepted' | 'declined' | 'pending' | null;
    latestOutcomeAt?: string | null;
    latestOutcomeMessage?: string | null;
  };
  error?: string;
}> {
  try {
    const canUpdate = await hasPermission(PERMISSIONS.manage.propertySelfUpdate);
    const canDelete = await hasPermission(PERMISSIONS.manage.propertySelfDelete);
    if (!canUpdate && !canDelete) {
      throw new Error('You do not have permission to access property change context.');
    }
    const accountId = await requireIdentity();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [currentUserChange, currentUserRecentChanges, otherRecentChanges, latestOutcomeChange] = await Promise.all([
      prisma.propertyChange.findFirst({
        where: {
          propertyId,
          accountId,
          isApproved: null,
        },
        orderBy: { modifiedOn: 'desc' },
      }),
      prisma.propertyChange.count({
        where: {
          propertyId,
          accountId,
          modifiedOn: { gte: sevenDaysAgo },
        },
      }),
      prisma.propertyChange.count({
        where: {
          propertyId,
          accountId: { not: accountId },
          modifiedOn: { gte: sevenDaysAgo },
        },
      }),
      prisma.propertyChange.findFirst({
        where: {
          propertyId,
          accountId,
          isApproved: { not: null },
          modifiedOn: { gte: sevenDaysAgo },
        },
        orderBy: { modifiedOn: 'desc' },
      }),
    ]);

    const latestOutcome = latestOutcomeChange
      ? latestOutcomeChange.isApproved
        ? 'accepted'
        : 'declined'
      : currentUserChange && currentUserChange.isApproved === null
        ? 'pending'
        : null;

    return {
      success: true,
      currentUserChange: currentUserChange ? {
        id: currentUserChange.id,
        status: currentUserChange.status,
        isApproved: currentUserChange.isApproved,
        data: normalizePropertyChangeData(currentUserChange.data as Record<string, any>),
        modifiedOn: currentUserChange.modifiedOn.toISOString(),
        accountId: currentUserChange.accountId,
      } : null,
      recentActivity: {
        hasCurrentUserChangeInLast7Days: currentUserRecentChanges > 0,
        hasOtherUserChangeInLast7Days: otherRecentChanges > 0,
        latestOutcome,
        latestOutcomeAt: latestOutcomeChange?.modifiedOn?.toISOString?.() || null,
        latestOutcomeMessage: latestOutcome === 'accepted'
          ? 'Your changes have been accepted.'
          : latestOutcome === 'declined'
            ? 'Your changes have been declined.'
            : latestOutcome === 'pending'
              ? 'Your changes are awaiting review.'
              : null,
      },
    };
  } catch (e: any) {
    await logProblem(e, `getPropertyChangeContextAction ${propertyId}`);
    return { success: false, error: e.message || 'Failed to load property change context.' };
  }
}

export async function cancelPropertyChangeDraftAction(changeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const accountId = await requireIdentity();
    const draft = await prisma.propertyChange.findFirst({
      where: {
        id: changeId,
        accountId,
        isApproved: null,
      },
      select: {
        id: true,
        propertyId: true,
        status: true,
      },
    });

    if (!draft) {
      return { success: false, error: 'Pending request not found.' };
    }

    if (draft.status === 'deleting') {
      await requirePermission(PERMISSIONS.manage.propertySelfDelete);
    } else {
      await requirePermission(PERMISSIONS.manage.propertySelfUpdate);
    }

    if ((draft.status === 'creation_draft' || draft.status === 'creation_pending' || draft.status === 'creating') && draft.propertyId) {
      await deletePropertyService(draft.propertyId);
      return { success: true };
    }

    if (draft.status === 'deleting' && draft.propertyId) {
      await prisma.property.update({
        where: { id: draft.propertyId },
        data: { status: 'ACTIVE' },
      });
    }

    await prisma.propertyChange.delete({
      where: { id: draft.id },
    });

    revalidatePath('/manage/properties');
    if (draft.propertyId) {
      revalidatePath(`/manage/properties/${draft.propertyId}`);
    }
    return { success: true };
  } catch (e: any) {
    await logProblem(e, `cancelPropertyChangeDraftAction ${changeId}`);
    return { success: false, error: e.message || 'Failed to cancel property change draft.' };
  }
}

export async function reviewPropertyChangeAction(input: {
  changeId: string;
  propertyId?: string | null;
  approve: boolean;
  acceptedFields?: string[];
}): Promise<{ success: boolean; error?: string; propertyId?: string | null }> {
  try {
    await requirePermission(PERMISSIONS.manage.propertyReviewApprove);
    const accountId = await requireIdentity();
    const request = await prisma.propertyChange.findFirst({
      where: {
        id: input.changeId,
        ...(input.propertyId ? { propertyId: input.propertyId } : {}),
        isApproved: null,
      },
    });

    if (!request) {
      return { success: false, error: 'Pending request not found.' };
    }

    if (input.approve) {
      const requestData = normalizePropertyChangeData(request.data as Record<string, any>);
      const internalAcceptedFieldBlacklist = new Set([
        'postingAgencyId',
        'createdById',
        'createdForId',
        'workingProfileId',
        'workingProfileType',
        'transferToId',
        'created_by',
        'transfer_to',
      ]);
      const acceptedFields = input.acceptedFields?.length ? input.acceptedFields : Object.keys(requestData);
      const acceptedData = acceptedFields
        .filter((field) => !internalAcceptedFieldBlacklist.has(field))
        .map((field) => ({ field, value: requestData[field] }))
        .filter((entry) => entry.value !== undefined);

      if (request.status === 'creation_pending' || request.status === 'creating' || request.status === 'creation_draft') {
        const creationLogData = [
          ...acceptedData,
          {
            field: 'created_by',
            value: request.createdById ?? requestData.createdById ?? request.accountId,
          },
          ...(typeof requestData.transfer_to === 'string' && requestData.transfer_to.trim().length > 0
            ? [{
                field: 'transfer_to',
                value: requestData.transfer_to.trim(),
              }]
            : []),
        ];
        const createdPropertyId = request.propertyId
          ? request.propertyId
          : await createPropertyService(requestData as CreatePropertyInput);
        if (request.propertyId) {
          await updatePropertyWithExtractedData(createdPropertyId, requestData as any);
          await approveProperty(createdPropertyId);
        }
        await createPropertyLog({
          propertyId: createdPropertyId,
          requestedBy: request.accountId,
          approvedBy: accountId,
          approvedOn: new Date(),
          data: creationLogData,
        });
        await prisma.propertyChange.update({
          where: { id: request.id },
          data: {
            propertyId: createdPropertyId,
            isApproved: true,
            modifiedOn: new Date(),
          },
        });
        revalidatePath('/manage/properties');
        revalidatePath(`/manage/properties/${createdPropertyId}`);
        return { success: true, propertyId: createdPropertyId };
      }

      if (!request.propertyId) {
        return { success: false, error: 'Pending request is missing its property reference.' };
      }

      if (request.status === 'deleting') {
        await createPropertyLog({
          propertyId: request.propertyId,
          requestedBy: request.accountId,
          approvedBy: accountId,
          approvedOn: new Date(),
          data: acceptedData.length ? acceptedData : [{ field: 'status', value: 'deleting' }],
        });
        await prisma.propertyChange.update({
          where: { id: request.id },
          data: {
            isApproved: true,
            modifiedOn: new Date(),
          },
        });
        await deletePropertyService(request.propertyId);
        revalidatePath('/manage/properties');
        return { success: true, propertyId: null };
      } else {
        const data = acceptedFields.reduce<Record<string, any>>((picked, field) => {
          const value = requestData[field];
          if (value !== undefined) picked[field] = value;
          return picked;
        }, {});
        await updatePropertyWithExtractedData(request.propertyId, data as any);
        await approveProperty(request.propertyId);
        await createPropertyLog({
          propertyId: request.propertyId,
          requestedBy: request.accountId,
          approvedBy: accountId,
          approvedOn: new Date(),
          data: acceptedData,
        });
      }
      await prisma.propertyChange.update({
        where: { id: request.id },
        data: {
          isApproved: true,
          modifiedOn: new Date(),
        },
      });
      return { success: true, propertyId: request.propertyId };
    }

    await prisma.propertyChange.update({
      where: { id: request.id },
      data: {
        isApproved: false,
        modifiedOn: new Date(),
      },
    });

    if (request.status === 'deleting' && request.propertyId) {
      await prisma.property.update({
        where: { id: request.propertyId },
        data: { status: 'ACTIVE' },
      });
      revalidatePath('/manage/properties');
      revalidatePath(`/manage/properties/${request.propertyId}`);
    }

    if (input.acceptedFields?.length) {
      const requestPropertyId = request.propertyId;
      if (!requestPropertyId) {
        return { success: true, propertyId: null };
      }
      await createPropertyLog({
        propertyId: requestPropertyId,
        requestedBy: request.accountId,
        approvedBy: accountId,
        approvedOn: new Date(),
        data: input.acceptedFields
          .map((field) => ({ field, value: normalizePropertyChangeData(request.data as Record<string, any>)[field] }))
          .filter((entry) => entry.value !== undefined),
      });
    }
    return { success: true, propertyId: request.propertyId };
  } catch (e: any) {
    await logProblem(e, `reviewPropertyChangeAction ${input.propertyId}/${input.changeId}`);
    return { success: false, error: e.message || 'Failed to review property change.' };
  }
}

function mapPropertyToCreateFormValues(property: Property): Partial<CreatePropertyFormValues> {
  return {
    title: property.title,
    description: property.description,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    kitchens: property.kitchens,
    diningRooms: property.diningRooms,
    livingRooms: property.livingRooms,
    carParkingSpots: property.carParkingSpots,
    bikeParkingSpots: property.bikeParkingSpots,
    area: property.area ? { sqft: property.area } : undefined,
    areaUnit: property.areaUnit,
    facing: property.facing,
    buildStart: property.buildStart,
    buildCompleted: property.buildCompleted,
    purpose: property.purpose,
    purposes: property.purposes?.length ? property.purposes : [property.purpose],
    categories: property.category ? [property.category] : [],
    types: property.type ? [property.type] : [],
    amenities: Array.isArray(property.amenities) ? property.amenities.join(', ') : '',
    images: Array.isArray(property.images) ? property.images : [],
    listingAgent: property.listingAgent || '',
    listingAgentAccountId: property.listingAgentId || '',
    isOwnerListing: property.isOwnerListing || false,
    floors: property.floors ?? undefined,
    onFloor: property.onFloor ?? undefined,
    roadAccess: property.roadAccess ?? undefined,
    landDetails: property.landDetails ? {
      ...property.landDetails,
      area: property.landDetails.area != null
        ? (typeof property.landDetails.area === 'number'
          ? { sqft: property.landDetails.area }
          : property.landDetails.area)
        : undefined,
    } : {},
    plots: (property.plots ?? []).map((plot: any) => ({
      ...plot,
      area: plot.area != null
        ? (typeof plot.area === 'number' ? { sqft: plot.area } : plot.area)
        : undefined,
    })),
    apartmentDetails: property.apartmentDetails || {},
    apartmentUnits: (property.apartmentUnits ?? []).map((unit: any) => ({
      ...unit,
      area: unit.area != null
        ? (typeof unit.area === 'number' ? { sqft: unit.area } : unit.area)
        : undefined,
    })),
    structuredLocation: property.structuredLocation || {},
    pricing: property.pricing ? {
      ...property.pricing,
      options: Array.isArray(property.pricing.options) ? property.pricing.options.join(', ') : '',
    } : { listed: property.price, currency: 'USD', priceDisplayMode: 'show-price', negotiable: false },
    roadAccessDetails: property.roadAccessDetails || undefined,
    distancing: property.distancing || undefined,
    earnings: property.earnings || undefined,
    owners: property.owners || [],
    documents: property.documents || [],
  };
}

export async function getPropertyCreateDraftAction(propertyId: string): Promise<{
  success: boolean;
  data?: Partial<CreatePropertyFormValues>;
  error?: string;
}> {
  try {
    const property = await getPropertyById(propertyId, { includeInactive: true });
    if (!property) {
      return { success: false, error: 'Property not found.' };
    }

    return {
      success: true,
      data: mapPropertyToCreateFormValues(property),
    };
  } catch (e: any) {
    await logProblem(e, `getPropertyCreateDraftAction ${propertyId}`);
    return { success: false, error: e.message || 'Failed to load property data.' };
  }
}

export async function createPropertyAction(
  data: CreatePropertyFormValues,
  postingAgencyId?: string | null,
  changeId?: string | null,
  workingProfileId?: string | null,
): Promise<{ success: boolean; error?: string | null; propertyId?: string | null; changeId?: string | null }> {
  try {
    await requirePermission(PERMISSIONS.manage.propertySelfCreate);
    const actorId = await requireIdentity();
    const draft = changeId?.trim()
      ? await editUncreatedPropertyDraftRequest({
          requestId: changeId.trim(),
          actorId,
          postingAgencyId,
          workingProfileId,
          data,
        })
      : await createPropertyDraftRequest({ actorId, postingAgencyId, workingProfileId, data });
    revalidatePath('/manage/properties');
    return { success: true, propertyId: null, changeId: draft.requestId, error: null };
  } catch (e: any) {
    await logProblem(e, 'createPropertyAction');
    if (e instanceof z.ZodError) {
        return { success: false, error: e.message, propertyId: null, changeId: null };
    }
    return { success: false, error: "An unexpected server error occurred.", propertyId: null, changeId: null };
  }
}

export async function getCurrentPropertyPostingContextAction(input?: {
  workingProfileId?: string | null;
}): Promise<{
  success: boolean;
  actorAccountId?: string;
  actorDisplayName?: string | null;
  actorDisplayImage?: string | null;
  effectiveProfileId?: string;
  effectiveProfileName?: string | null;
  isAgencyProfile?: boolean;
  postingAgencyId?: string | null;
  error?: string;
}> {
  try {
    await requirePermission(PERMISSIONS.manage.propertySelfCreate);
    const actorId = await requireIdentity();
    const context = await resolvePropertyPostingContext({
      actorAccountId: actorId,
      requestedWorkingProfileId: input?.workingProfileId,
    });

    return {
      success: true,
      actorAccountId: context.actorAccountId,
      actorDisplayName: context.actorDisplayName,
      actorDisplayImage: context.actorDisplayImage,
      effectiveProfileId: context.effectiveProfileId,
      effectiveProfileName: context.effectiveProfileName,
      isAgencyProfile: context.profileType === 'agency',
      postingAgencyId: context.postingAgencyId,
    };
  } catch (error: any) {
    await logProblem(error, 'getCurrentPropertyPostingContextAction');
    return {
      success: false,
      error: error?.message || 'Failed to resolve property posting context.',
    };
  }
}

export async function updatePropertyAction(
  id: string,
  data: UpdatePropertyFormValues
): Promise<{ success: boolean; error?: string | null; }> {
  try {
    await requirePermission(PERMISSIONS.manage.propertySelfUpdate);
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

    const priceDisplayMode = validatedData.pricing?.priceDisplayMode ?? 'show-price';
    const resolvedPrice = firstPositivePrice(validatedData.pricing);
    const pricing = cleanPricing(validatedData.pricing);

    if (priceDisplayMode === 'show-price' && resolvedPrice <= 0) {
        return { success: false, error: "Show price requires at least one price." };
    }
    
    const locationString = formatLocationString(validatedData.structuredLocation);

    const serviceInput: UpdatePropertyInput = {
      ...validatedData,
      purpose: orderedPurposes[0],
      purposes: orderedPurposes,
      location: locationString,
      price: resolvedPrice,
      details: {
        priceDisplayMode,
        showMap: validatedData.showMap ?? true,
        showOwnerInformation: validatedData.showOwnerInformation ?? true,
        isPrivate: validatedData.isPrivate ?? false,
      },
      area: areaValueToSqft(validatedData.area),
      amenities: validatedData.amenities?.split(',').map(a => a.trim()).filter(Boolean) || [],
      images: validatedData.images?.filter(img => img.trim() !== '') || [],
      pricing,
      owners: normalizeOwnerEntries(validatedData.owners),
      landDetails: validatedData.landDetails ? {
        ...validatedData.landDetails,
        area: areaValueToSqft(validatedData.landDetails.area),
      } as unknown as LandDetails : undefined,
      plots: validatedData.plots?.map(p => ({ ...p, area: areaValueToSqft(p.area) })) as unknown as PlotDetails[],
      apartmentUnits: validatedData.apartmentUnits?.map(u => ({ ...u, area: areaValueToSqft(u.area) })) as unknown as ApartmentUnit[],
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
    });

    const updatePayload: UpdatePropertyInput = {
        ...(property as unknown as UpdatePropertyInput),
        title: rewrittenData.rewrittenTitle,
        description: rewrittenData.rewrittenDescription,
        location: rewrittenData.rewrittenLocation,
    };

    await updatePropertyService(propertyId, updatePayload);

    revalidatePath(`/manage/properties/${propertyId}/edit`);
    revalidatePath(`/manage/properties`);

    return { success: true, data: rewrittenData };
  } catch (e: any) {
    await logProblem(e, `rewritePropertyDetailsAction (ID: ${propertyId})`);
    return { success: false, error: e.message || "Failed to rewrite property details." };
  }
}


export async function createAgencyAction(
  data: CreateAgencyFormValues
): Promise<{ success: boolean; error?: string | null; agencyId?: string | null }> {
  try {
    await requirePermission(PERMISSIONS.public.createAgency);
    const actorId = await requireIdentity();
    const validatedData = CreateAgencySchema.parse(data);
    const serviceInput: CreateAgencyInput = {
      ...validatedData,
      branches: validatedData.branches?.split('\\n').map(b => b.trim()).filter(Boolean) || [],
    };
    const agencyId = await createAgencyService(serviceInput);
    const actorAccount = await prisma.account.findUnique({
      where: { id: actorId },
      select: { id: true, accountType: true, workingProfile: true },
    });

    const targetAccountId = actorAccount?.workingProfile?.trim() || actorId;
    const targetAccount =
      targetAccountId === actorId
        ? actorAccount
        : await prisma.account.findUnique({
            where: { id: targetAccountId },
            select: { id: true, accountType: true },
          });

    if (targetAccount && isAgencyLikeAccountType(targetAccount.accountType)) {
      await prisma.account.updateMany({
        where: { id: targetAccount.id },
        data: { accountType: promoteStoredAccountType(targetAccount.accountType, 'agency') },
      });
    }
    revalidatePath('/manage/team');
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
    await requirePermission(PERMISSIONS.public.createAgency);
    await requireIdentity();
    const validatedData = UpdateAgencySchema.parse(data);
    const serviceInput: UpdateAgencyInput = {
      ...validatedData,
      branches: validatedData.branches?.split('\\n').map(b => b.trim()).filter(Boolean) || [],
    };
    await updateAgencyService(id, serviceInput);
    revalidatePath('/manage/team');
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
        await requirePermission(PERMISSIONS.public.createAgency);
        await deleteAgencyService(agencyId);
        revalidatePath('/manage/team');
        revalidatePath('/agencies');
        return { success: true };
    } catch (error: any) {
        await logProblem(error, `deleteAgencyAction (ID: ${agencyId})`);
        return { success: false, error: "Failed to delete agency." };
    }
}

export async function createAgencyAgentMapAction(
  data: { agencyId: string; agentId: string; isAdmin?: boolean },
): Promise<{ success: boolean; error?: string | null }> {
  try {
    await requirePermission(PERMISSIONS.manage.agentMapView);

    const agencyId = data.agencyId?.trim();
    const agentId = data.agentId?.trim();

    if (!agencyId || !agentId) {
      return { success: false, error: 'Select both an agency and an agent.' };
    }

    await createAgencyAgentMapService({
      agencyId,
      agentId,
      status: 'invited',
      isAdmin: Boolean(data.isAdmin),
    });

    const agentAccount = await prisma.account.findUnique({
      where: { id: agentId },
      select: { accountType: true },
    });

    if (agentAccount) {
      await prisma.account.updateMany({
        where: { id: agentId },
        data: { accountType: promoteStoredAccountType(agentAccount.accountType, 'worker') },
      });
    }

    revalidatePath('/manage/agentmap');
    revalidatePath('/manage/properties/create');
    revalidatePath('/manage');
    revalidatePath('/manage/dashboard');
    return { success: true, error: null };
  } catch (error: any) {
    await logProblem(error, 'createAgencyAgentMapAction');
    return { success: false, error: error?.message ?? 'Failed to create agency-agent mapping.' };
  }
}

export async function createLeadAction(
  data: {
    existingClientId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    source?: string;
    type: any;
    priority: any;
    assignedTo?: string;
    requirement?: Record<string, any>;
  },
): Promise<{ success: boolean; error?: string | null; leadId?: string | null }> {
  try {
    await requirePermission(PERMISSIONS.manage.selfLeadCreate);
    const actorId = await requireIdentity();
    const currentAccount = await getAccountById(actorId);
    const fallbackAgencyId = currentAccount && ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(currentAccount.account_type)
      ? actorId
      : currentAccount?.agency ??
        (await getAgencyAgentMapsByAgentService(actorId)).find((link) => link.status === 'accepted')?.agencyId ??
        null;

    const assignedTo = data.assignedTo?.trim() || actorId;

    if (data.assignedTo?.trim()) {
      if (!fallbackAgencyId) {
        return { success: false, error: 'You can only assign a lead owner from your agency.', leadId: null };
      }

      const agencyMembers = await getAgencyAgentMapsByAgencyService(fallbackAgencyId);
      const allowedOwnerIds = new Set(
        agencyMembers
          .filter((member) => member.status === 'accepted')
          .map((member) => member.agentId),
      );
      allowedOwnerIds.add(actorId);

      if (!allowedOwnerIds.has(assignedTo)) {
        return { success: false, error: 'Lead owner must be an agent in your agency.', leadId: null };
      }
    }

    const leadId = await createLeadService({
      existingClientId: data.existingClientId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      source: data.source,
      type: data.type,
      priority: data.priority,
      assignedTo,
      requirement: data.requirement,
    });

    revalidatePath('/manage/leads');
    revalidatePath('/manage/leads/my');
    revalidatePath('/manage/leads/shared');
    return { success: true, error: null, leadId };
  } catch (error: any) {
    await logProblem(error, 'createLeadAction');
    return { success: false, error: error?.message ?? 'Failed to create lead.', leadId: null };
  }
}

export async function addLeadActivityAction(
  data: {
    leadId: string;
    activityType: 'follow_up' | 'visit' | 'meeting' | 'remarks';
    activityOn?: string;
    followUpMethod?: 'phone call' | 'whatsapp' | 'email';
    propertyId?: string;
    remarks: string;
  },
): Promise<{ success: boolean; error?: string | null; activityId?: string | null }> {
  try {
    await requirePermission(PERMISSIONS.manage.selfLeadAddActivity);
    const actorId = await requireIdentity();
    const account = await getAccountById(actorId);
    const activityBy = account?.display_name?.trim() || actorId;

    if (!data.leadId?.trim()) {
      return { success: false, error: 'Lead ID is required.', activityId: null };
    }

    const activityId = await createLeadActivityService({
      leadId: data.leadId,
      activityType: data.activityType,
      activityOn: data.activityOn,
      followUpMethod: data.followUpMethod,
      propertyId: data.propertyId,
      remarks: data.remarks,
      activityBy,
    });

    revalidatePath(`/manage/leads/shared/${data.leadId}`);
    revalidatePath('/manage/leads/shared');
    revalidatePath('/manage/leads');
    return { success: true, error: null, activityId };
  } catch (error: any) {
    await logProblem(error, 'addLeadActivityAction');
    return { success: false, error: error?.message ?? 'Failed to add lead activity.', activityId: null };
  }
}

export async function acceptAgencyAgentMapAction(mapId: string): Promise<{ success: boolean; error?: string | null }> {
  try {
    const actorId = await requireIdentity();
    const link = await prisma.agencyAgentMap.findUnique({ where: { id: mapId } });

    if (!link || link.agentId !== actorId) {
      return { success: false, error: 'Invitation not found.' };
    }

    await prisma.agencyAgentMap.update({
      where: { id: mapId },
      data: {
        status: 'accepted',
      },
    });

    revalidatePath('/manage');
    revalidatePath('/manage/dashboard');
    revalidatePath('/manage/properties/create');
    revalidatePath('/manage/properties');
    revalidatePath('/manage/leads/base');
    revalidatePath('/manage/leads/shared');
    revalidatePath('/manage/leads/my');
    return { success: true, error: null };
  } catch (error: any) {
    await logProblem(error, 'acceptAgencyAgentMapAction');
    return { success: false, error: error?.message ?? 'Failed to accept invitation.' };
  }
}

export async function approvePropertyAction(propertyId: string) {
    try {
        const actorId = await requireIdentity();
        await approveProperty(propertyId);
        const property = await getPropertyById(propertyId, { includeInactive: true });
        if (property) {
          await createPropertyLog({
            propertyId,
            requestedBy: actorId,
            approvedBy: actorId,
            approvedOn: new Date(),
            data: Object.entries(property as Record<string, any>).map(([field, value]) => ({
              field,
              value: field === 'owner' ? normalizeOwnerReferenceEntries(value) : value,
            })),
          });
        }
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
        await requirePermission(PERMISSIONS.manage.propertySelfDelete);
        await deletePropertyService(propertyId);
        revalidatePath('/manage/properties');
        return { success: true };
    } catch (error: any) {
        await logProblem(error, `deletePropertyAction (ID: ${propertyId})`);
        return { success: false, error: "Failed to delete property." };
    }
}

export async function requestPropertyDeletionAction(propertyId: string) {
    try {
        await requirePermission(PERMISSIONS.manage.propertySelfDelete);
        const accountId = await requireIdentity();
        const existingDraft = await prisma.propertyChange.findFirst({
            where: {
                propertyId,
                accountId,
                status: 'deleting',
                isApproved: null,
            },
            orderBy: { modifiedOn: 'desc' },
            select: {
                id: true,
                data: true,
            },
        });

        const nextData = existingDraft?.data && typeof existingDraft.data === 'object' && !Array.isArray(existingDraft.data)
            ? normalizePropertyChangeData(existingDraft.data as Record<string, any>)
            : {};

        await prisma.propertyChange.upsert({
            where: { id: existingDraft?.id ?? '__new_property_change__' },
            update: {
                status: 'deleting',
                data: nextData,
                modifiedOn: new Date(),
            },
            create: {
                propertyId,
                accountId,
                status: 'deleting',
                isApproved: null,
                data: nextData,
            },
        });
        revalidatePath('/manage/properties');
        revalidatePath(`/manage/properties/${propertyId}`);
        return { success: true };
    } catch (error: any) {
        await logProblem(error, `requestPropertyDeletionAction (ID: ${propertyId})`);
        return { success: false, error: "Failed to request property deletion." };
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

export async function getPendingPropertiesForAgent(limit: number): Promise<{ id: string; title: string; kind: 'property' | 'draft'; propertyId?: string; requestId?: string }[]> {
    const awaitingReviewItems = await getAwaitingReviewItems(limit);
    return awaitingReviewItems
      .filter((item) => item.kind === 'property' || item.propertyId)
      .map((item) => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      propertyId: item.propertyId,
      requestId: item.kind === 'draft' ? item.id : undefined,
    }));
}

export async function getApprovedPropertiesForAgent(limit: number): Promise<{ id:string; title: string }[]> {
    void limit;
    return [];
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
    if (validatedData.registered && validatedData.userId) {
      const agentAccount = await prisma.account.findUnique({
        where: { id: validatedData.userId },
        select: { accountType: true },
      });
      await prisma.account.updateMany({
        where: { id: validatedData.userId },
        data: { accountType: promoteStoredAccountType(agentAccount?.accountType, 'agent') },
      });
    }
    revalidatePath('/manage/team');
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
    revalidatePath('/manage/team');
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
        revalidatePath('/manage/team');
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

export async function clearSiteDevLogsAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await clearSiteDevLogs();
    revalidatePath('/manage/site');
    revalidatePath('/manage/site/devlogs');
    return { success: true };
  } catch (error: any) {
    await logProblem(error, 'clearSiteDevLogsAction');
    return { success: false, error: 'Failed to clear dev logs.' };
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

export async function deleteAccountAction(accountId: string) {
  try {
    await deleteAccountAndData(accountId);
    try {
      revalidatePath('/manage/accounts');
    } catch (_) {}
    return { success: true };
  } catch (e: any) {
    await logProblem(e, `deleteAccountAction (ID: ${accountId})`);
    return { success: false, error: 'Failed to delete account.' };
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
        
        // Update account last access time
        await updateAccountAccessInfo(userId, 'unknown');
        
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
    await requirePermission(PERMISSIONS.manage.faqCreate);
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
    await requirePermission(PERMISSIONS.manage.faqUpdate);
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
        await requirePermission(PERMISSIONS.manage.faqDelete);
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
    await requirePermission(PERMISSIONS.public.propertyInquire);
    const actorId = await requireIdentity();
    const validatedData = CreateInquirySchema.parse({ ...data, submittedBy: actorId });
    await createInquiryService(validatedData);
    revalidatePath('/manage/inquiries');
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
    await requirePermission(PERMISSIONS.public.propertySave);
    // Verify identity via gRPC — use the verified accountId, not the client-supplied userId
    const identity = await getIdentity();
    const verifiedUserId = identity.authenticated ? identity.account.accountId : userId;

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
        await requirePermission(PERMISSIONS.public.requirementCreate);
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
        await requirePermission(PERMISSIONS.public.mortgageRequest);
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
        await requirePermission(PERMISSIONS.public.contactPost);
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
        await requirePermission(PERMISSIONS.public.requirementCreate);
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

/**
 * Resolves the account for the current visitor.
 *
 * - If `aid` is provided (authenticated user from auth_accounts cookie):
 *     upserts the account in the DB and returns the aid.
 * - If `aid` is null (guest):
 *     creates a new `track.*` account in the DB and returns its ID.
 *
 * The returned ID should be stored in the `temp_account_id` cookie by the
 * client only when the user is a guest (no aid). Authenticated users already
 * have their ID in the auth_accounts cookie.
 */
export async function resolveAccountAction(
  aid: string | null,
): Promise<{ success: boolean; accountId?: string; error?: string }> {
    try {
        const accountId = await resolveAccount(aid);
        return { success: true, accountId };
    } catch (error: any) {
        await logProblem(error, 'resolveAccountAction');
        return { success: false, error: 'Failed to resolve account.' };
    }
}

/** @deprecated Use resolveAccountAction(null) instead. */
export async function getOrCreateTemporaryAccountAction(): Promise<{ success: boolean; accountId?: string; error?: string }> {
    return resolveAccountAction(null);
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
