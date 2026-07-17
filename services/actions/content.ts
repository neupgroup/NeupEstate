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
import { hasPermission, requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';
import { prisma } from '@/core/database/prisma';
import { isAgencyLikeAccountType, promoteStoredAccountType } from '@/services/account-type';
import { resolvePropertyPostingContext } from '@/services/property-posting-context';
import { requireIdentity, formatLocationString, firstPositivePrice, cleanPricing, deepMergeJson, normalizeOwnerEntries, normalizeOwnerReferenceEntries, normalizePropertyChangeData, mapPropertyToCreateFormValues } from '@/services/actions/helpers';

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
