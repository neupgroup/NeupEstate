"use server";

import { naturalLanguagePropertySearch as naturalLanguagePropertySearchFlow } from "@/services/intelligence/natural-language-property-search";
import { recommendProperties as recommendPropertiesFlow } from "@/services/intelligence/ai-powered-recommendations";
import { extractAndSaveProperty as extractAndSavePropertyFlow, type ExtractPropertyDetailsOutput } from "@/services/intelligence/extract-property-details-flow";
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
import { runPropertyApproval as runPropertyApprovalFlow } from "@/services/intelligence/property-approval-flow";
import { runPropertyAmendment as runPropertyAmendmentFlow } from "@/services/intelligence/property-amendment-flow";
import { runPropertyAssurance as runPropertyAssuranceFlow } from "@/services/intelligence/property-assurance-flow";
import { rewritePropertyDetails } from "@/services/intelligence/rewrite-property-details-flow";
import { parseAdminFilter } from "@/services/intelligence/parse-admin-filter-flow";
import { suggestQuestions as suggestQuestionsFlow } from '@/services/intelligence/suggest-questions-flow';
import { logActivity as logActivityService } from '@/services/activities/log';
import { updateAccountAccessInfo } from '@/services/accounts/id/lookup';
import { updateAccountPreferences, getAccountPreferences } from '@/services/accounts/single/preferences';
import { updatePrompt as updatePromptService, createPrompt as createPromptService, deletePrompt as deletePromptService } from '@/services/intelligence/prompts';
import { createPropertyRequest as createPropertyRequestService } from '@/services/inquiry/property-requests';
import { createInquiry as createInquiryService } from '@/services/inquiry/create';
import { updateInquiry as updateInquiryService } from '@/services/inquiry/update';
import { createSalesRequest as createSalesRequestService } from '@/services/inquiry/sales-requests';
import { createVisitRequest as createVisitRequestService } from '@/services/properties/single/engage/visit';
import { createMortgageRequest as createMortgageRequestService } from '@/services/mortgage/create';
import { createModel as createModelService, updateModel as updateModelService, deleteModel as deleteModelService, setDefaultModel as setDefaultModelService } from '@/services/intelligence/models';
import { createRequirement as createRequirementService } from '@/services/requirements/create';
import { updateRequirement as updateRequirementService } from '@/services/requirements/update';
import { createPropertyDraftRequest, editUncreatedPropertyDraftRequest } from '@/services/properties/create';
import { resolveAccount, updateUser, getAccountById, getAccounts } from '@/services/accounts/id/lookup';
import { deleteAccountAndData } from '@/services/accounts/id/delete';
import { createLead as createLeadService } from '@/services/leads/create';
import { createLeadActivity as createLeadActivityService } from '@/services/leads/activity/create';
import { getIdentity } from '@/services/neupid/get-identity';
import { hasPermission, requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';
import { prisma } from '@neup/core/database/prisma';
import { isAgencyLikeAccountType } from '@/services/accounts/type';
import { resolvePropertyCreateContext } from '@/services/properties/create/context';
import { requireIdentity, formatLocationString, firstPositivePrice, cleanPricing, deepMergeJson, normalizeOwnerEntries, normalizeOwnerReferenceEntries, normalizePropertyChangeData, mapPropertyToCreateFormValues } from '@/services/properties/action-helpers';

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
    await logger().type(`suggestPropertyQuestionsAction (ID: ${propertyId})`).data({ error: String(e), details: {} }).log();
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
    await createInquiryService(actorId, "property", validatedData);
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
    await updateInquiryService(inquiryId, status);
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
    await logger().type(`createPromptAction (ID: ${data.id})`).data({ error: String(e), details: {} }).log();
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
    await logger().type(`updatePromptAction (ID: ${data.id})`).data({ error: String(e), details: {} }).log();
    return { success: false, error: "An unexpected server error occurred." };
  }
}

export async function deletePromptAction(promptId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deletePromptService(promptId);
    revalidatePath('/manage/settings/ai-configuration');
    return { success: true };
  } catch (error: any) {
    await logger().type(`deletePromptAction (ID: ${promptId})`).data({ error: String(error), details: {} }).log();
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
    await logger().type(`createModelAction`).data({ error: String(e), details: {} }).log();
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
    await logger().type(`updateModelAction`).data({ error: String(e), details: {} }).log();
    return { success: false, error: (e as Error).message };
  }
}

export async function deleteModelAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteModelService(id);
    revalidatePath('/manage/settings/ai-models');
    return { success: true };
  } catch (e: any) {
    await logger().type(`deleteModelAction`).data({ error: String(e), details: {} }).log();
    return { success: false, error: (e as Error).message };
  }
}

export async function setDefaultModelAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await setDefaultModelService(id);
    revalidatePath('/manage/settings/ai-models');
    return { success: true };
  } catch (e: any) {
    await logger().type(`setDefaultModelAction`).data({ error: String(e), details: {} }).log();
    return { success: false, error: (e as Error).message };
  }
}
