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
import { createLead as createLeadService } from '@/services/leads/create';
import { createLeadActivity as createLeadActivityService } from '@/services/leads/activity/create';
import { getIdentity } from '@/services/neupid/get-identity';
import { prisma } from '@/core/database/prisma';
import { isAgencyLikeAccountType, promoteStoredAccountType } from '@/services/account-type';
import { resolvePropertyPostingContext } from '@/services/property-posting-context';
import { requireIdentity, formatLocationString, firstPositivePrice, cleanPricing, deepMergeJson, normalizeOwnerEntries, normalizeOwnerReferenceEntries, normalizePropertyChangeData, mapPropertyToCreateFormValues } from '@/services/property/action-helpers';

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
