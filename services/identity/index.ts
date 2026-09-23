"use server";

import { naturalLanguagePropertySearch as naturalLanguagePropertySearchFlow } from "@/services/ai/natural-language-property-search";
import { recommendProperties as recommendPropertiesFlow } from "@/services/ai/ai-powered-recommendations";
import { extractAndSaveProperty as extractAndSavePropertyFlow, type ExtractPropertyDetailsOutput } from "@/services/ai/extract-property-details-flow";
import { createPropertyRecord as createPropertyService, updateProperty as updatePropertyService, approveProperty, getProperties, deleteProperty as deletePropertyService, getPendingProperties, getAwaitingReviewItems, getPaginatedProperties, getPropertyById, getPropertyReviewRequests, updatePropertyWithExtractedData, updatePropertyImages, toggleSavedProperty as toggleSavedPropertyService, getUsersBySavedProperty as getUsersBySavedPropertyService, getSavedPropertiesForUser as getSavedPropertiesForUserService, createPropertyLog } from '@/services/properties';
import { createAgency as createAgencyService, updateAgency as updateAgencyService, deleteAgency as deleteAgencyService } from '@/services/agencies/agency/service';
import { createAgencyAgentMap as createAgencyAgentMapService, getAgencyAgentAccountsByAgency as getAgencyAgentAccountsByAgencyService, getAgencyAgentMaps, getAgencyAgentMapsByAgent as getAgencyAgentMapsByAgentService, getAgencyAgentMapsByAgency as getAgencyAgentMapsByAgencyService } from '@/services/agencies/agent-maps/service';
import { getAgentsByLocation as getAgentsByLocationService, createAgent as createAgentService, updateAgent as updateAgentService, deleteAgent as deleteAgentService } from '@/services/agents/agent/service';
import { addSitemap, getNewUrlsFromSitemap, processSitemapUrl, updateSitemapCheckedTime } from "@/services/crawl/sitemap";
import { logger } from "@neup/logica/logger";
import type { NaturalLanguageSearchOutput, Property, CreatePropertyInput, UpdatePropertyInput, CreateAgencyInput, UpdateAgencyInput, PropertyApprovalResult, CreatePropertyFormValues, UpdatePropertyFormValues, CreateAgencyFormValues, UpdateAgencyFormValues, PropertyFilters, ExtractedPropertyData, SitemapLog, PropertyAmendmentResult, RewritePropertyDetailsOutput, PropertyAssuranceResult, Agent, CreateAgentFormValues, UpdateAgentFormValues, StructuredLocation, CreateUserActivityInput, PropertyImageUpdateResult, CreateInquiryFormValues, InquiryStatus, UpdatePromptFormValues, CreatePromptFormValues, User, CreatePropertyRequestFormValues, CreateSalesRequestFormValues, CreateVisitRequestFormValues, CreateMortgageRequestFormValues, PropertyActivityEvent, UserPreferences, AIModel, CreateAIModelFormValues, UpdateAIModelFormValues, CreateRequirementFormValues, Requirement, UpdateUserFormValues, LandDetails, PlotDetails, ApartmentUnit } from "@/types";
import { CreatePropertySchema, UpdatePropertySchema, CreateAgencySchema, UpdateAgencySchema, PropertyPurposeSchema, PropertyCategorySchema, PropertyUsageTypeSchema, CreateAgentSchema, UpdateAgentSchema, CreateInquirySchema, UpdatePromptSchema, CreatePromptSchema, CreatePropertyRequestSchema, CreateSalesRequestSchema, CreateVisitRequestSchema, CreateMortgageRequestSchema, CreateAIModelSchema, UpdateAIModelSchema, CreateRequirementSchema, UpdateUserSchema, areaValueToSqft } from "@/types";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { runPropertyApproval as runPropertyApprovalFlow } from "@/services/ai/property-approval-flow";
import { runPropertyAmendment as runPropertyAmendmentFlow } from "@/services/ai/property-amendment-flow";
import { runPropertyAssurance as runPropertyAssuranceFlow } from "@/services/ai/property-assurance-flow";
import { rewritePropertyDetails } from "@/services/ai/rewrite-property-details-flow";
import { parseAdminFilter } from "@/services/ai/parse-admin-filter-flow";
import { suggestQuestions as suggestQuestionsFlow } from '@/services/ai/suggest-questions-flow';
import { logActivity as logActivityService } from '@/services/activities/log';
import { updateAccountAccessInfo } from '@/services/accounts/id/lookup';
import { updateAccountPreferences, getAccountPreferences } from '@/services/accounts/single/preferences';
import { updatePrompt as updatePromptService, createPrompt as createPromptService, deletePrompt as deletePromptService } from '@/services/prompt-service';
import { createPropertyRequest as createPropertyRequestService, createInquiry as createInquiryService, updateInquiryStatus as updateInquiryStatusService } from '@/services/property-request-service';
import { createSalesRequest as createSalesRequestService } from '@/services/sales-request-service';
import { createVisitRequest as createVisitRequestService } from '@/services/properties/single/engage/visit';
import { createMortgageRequest as createMortgageRequestService } from '@/services/mortgage-request-service';
import { createModel as createModelService, updateModel as updateModelService, deleteModel as deleteModelService, setDefaultModel as setDefaultModelService } from '@/services/model-service';
import { createRequirement as createRequirementService } from '@/services/requirements/create';
import { createPropertyDraftRequest, editUncreatedPropertyDraftRequest } from '@/services/properties/create';
import { resolveAccount, updateUser, getAccountById, getAccounts } from '@/services/accounts/id/lookup';
import { deleteAccountAndData } from '@/services/accounts/id/delete';
import { createLead as createLeadService } from '@/services/leads/create';
import { createLeadActivity as createLeadActivityService } from '@/services/leads/activity/create';
import { getIdentity } from '@/services/neupid/get-identity';
import { prisma } from '@neup/core/database/prisma';
import { isAgencyLikeAccountType } from '@/services/accounts/type';
import { resolvePropertyCreateContext } from '@/services/properties/create/context';
import { requireIdentity, formatLocationString, firstPositivePrice, cleanPricing, deepMergeJson, normalizeOwnerEntries, normalizeOwnerReferenceEntries, normalizePropertyChangeData, mapPropertyToCreateFormValues } from '@/services/properties/action-helpers';

export async function getCurrentAccountId(): Promise<string | null> {
  const identity = await getIdentity();
  return identity.authenticated ? identity.account.accountId : null;
}
