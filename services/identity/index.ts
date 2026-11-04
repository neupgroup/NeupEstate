"use server";

import { naturalLanguageListingSearch as naturalLanguageListingSearchFlow } from "@/services/intelligence/natural-language-listing-search";
import { recommendListings as recommendListingsFlow } from "@/services/intelligence/ai-powered-recommendations";
import { extractAndSaveListing as extractAndSaveListingFlow, type ExtractListingDetailsOutput } from "@/services/intelligence/extract-listing-details-flow";
import { createListingRecord as createListingService, updateListing as updateListingService, approveListing, getListings, deleteListing as deleteListingService, getPendingListings, getAwaitingReviewItems, getPaginatedListings, getListingById, getListingReviewRequests, updateListingWithExtractedData, updateListingImages, toggleSavedListing as toggleSavedListingService, getUsersBySavedListing as getUsersBySavedListingService, getSavedListingsForUser as getSavedListingsForUserService, createListingLog } from '@/services/listings';
import { createAgency as createAgencyService, updateAgency as updateAgencyService, deleteAgency as deleteAgencyService } from '@/services/agencies/agency/service';
import { createAgencyAgentMap as createAgencyAgentMapService, getAgencyAgentAccountsByAgency as getAgencyAgentAccountsByAgencyService, getAgencyAgentMaps, getAgencyAgentMapsByAgent as getAgencyAgentMapsByAgentService, getAgencyAgentMapsByAgency as getAgencyAgentMapsByAgencyService } from '@/services/agencies/agent-maps/service';
import { getAgentsByLocation as getAgentsByLocationService, createAgent as createAgentService, updateAgent as updateAgentService, deleteAgent as deleteAgentService } from '@/services/agents/agent/service';
import { addSitemap, getNewUrlsFromSitemap, processSitemapUrl, updateSitemapCheckedTime } from "@/services/crawl/sitemap";
import { logger } from "@neup/logica/logger";
import type { NaturalLanguageSearchOutput, Listing, CreateListingInput, UpdateListingInput, CreateAgencyInput, UpdateAgencyInput, ListingApprovalResult, CreateListingFormValues, UpdateListingFormValues, CreateAgencyFormValues, UpdateAgencyFormValues, ListingFilters, ExtractedListingData, SitemapLog, ListingAmendmentResult, RewriteListingDetailsOutput, ListingAssuranceResult, Agent, CreateAgentFormValues, UpdateAgentFormValues, StructuredLocation, CreateUserActivityInput, ListingImageUpdateResult, CreateInquiryFormValues, InquiryStatus, UpdatePromptFormValues, CreatePromptFormValues, User, CreateListingRequestFormValues, CreateSalesRequestFormValues, CreateVisitRequestFormValues, CreateMortgageRequestFormValues, ListingActivityEvent, UserPreferences, AIModel, CreateAIModelFormValues, UpdateAIModelFormValues, CreateRequirementFormValues, Requirement, UpdateUserFormValues, LandDetails, PlotDetails, ApartmentUnit } from "@/types";
import { CreateListingSchema, UpdateListingSchema, CreateAgencySchema, UpdateAgencySchema, ListingPurposeSchema, ListingCategorySchema, ListingUsageTypeSchema, CreateAgentSchema, UpdateAgentSchema, CreateInquirySchema, UpdatePromptSchema, CreatePromptSchema, CreateListingRequestSchema, CreateSalesRequestSchema, CreateVisitRequestSchema, CreateMortgageRequestSchema, CreateAIModelSchema, UpdateAIModelSchema, CreateRequirementSchema, UpdateUserSchema } from "@/types";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { runListingApproval as runListingApprovalFlow } from "@/services/intelligence/listing-approval-flow";
import { runListingAmendment as runListingAmendmentFlow } from "@/services/intelligence/listing-amendment-flow";
import { runListingAssurance as runListingAssuranceFlow } from "@/services/intelligence/listing-assurance-flow";
import { rewriteListingDetails } from "@/services/intelligence/rewrite-listing-details-flow";
import { parseAdminFilter } from "@/services/intelligence/parse-admin-filter-flow";
import { suggestQuestions as suggestQuestionsFlow } from '@/services/intelligence/suggest-questions-flow';
import { logActivity as logActivityService } from '@/services/activities/log';
import { updateAccountAccessInfo } from '@/services/accounts/id/lookup';
import { updateAccountPreferences, getAccountPreferences } from '@/services/accounts/single/preferences';
import { updatePrompt as updatePromptService, createPrompt as createPromptService, deletePrompt as deletePromptService } from '@/services/intelligence/prompts';
import { createListingRequest as createListingRequestService } from '@/services/inquiry/listing-requests';
import { createInquiry as createInquiryService } from '@/services/inquiry/create';
import { updateInquiry as updateInquiryService } from '@/services/inquiry/update';
import { createSalesRequest as createSalesRequestService } from '@/services/inquiry/sales-requests';
import { createVisitRequest as createVisitRequestService } from '@/services/listings/single/engage/visit';
import { createMortgageRequest as createMortgageRequestService } from '@/services/mortgage/create';
import { createModel as createModelService, updateModel as updateModelService, deleteModel as deleteModelService, setDefaultModel as setDefaultModelService } from '@/services/intelligence/models';
import { createRequirement as createRequirementService } from '@/services/requirements/create';
import { createListingDraftRequest, editUncreatedListingDraftRequest } from '@/services/listings/create';
import { resolveAccount, updateUser, getAccountById, getAccounts } from '@/services/accounts/id/lookup';
import { deleteAccountAndData } from '@/services/accounts/id/delete';
import { createLead as createLeadService } from '@/services/leads/create';
import { createLeadActivity as createLeadActivityService } from '@/services/leads/activity/create';
import { getIdentity } from '@/services/neupid/get-identity';
import { prisma } from '@neup/core/database/prisma';
import { isAgencyLikeAccountType } from '@/services/accounts/type';
import { resolveListingCreateContext } from '@/services/listings/create/context';
import { requireIdentity, formatLocationString, firstPositivePrice, cleanPricing, deepMergeJson, normalizeOwnerEntries, normalizeOwnerReferenceEntries, normalizeListingChangeData, mapListingToCreateFormValues } from '@/services/listings/action-helpers';

export async function getCurrentAccountId(): Promise<string | null> {
  const identity = await getIdentity();
  return identity.authenticated ? identity.account.accountId : null;
}
