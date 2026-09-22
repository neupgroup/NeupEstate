"use server";

import { naturalLanguagePropertySearch as naturalLanguagePropertySearchFlow } from "@/services/ai/natural-language-property-search";
import { recommendProperties as recommendPropertiesFlow } from "@/services/ai/ai-powered-recommendations";
import { extractAndSaveProperty as extractAndSavePropertyFlow, type ExtractPropertyDetailsOutput } from "@/services/ai/extract-property-details-flow";
import { createProperty as createPropertyService, updateProperty as updatePropertyService, approveProperty, getProperties, deleteProperty as deletePropertyService, getPendingProperties, getAwaitingReviewItems, getPaginatedProperties, getPropertyById, getPropertyReviewRequests, updatePropertyWithExtractedData, updatePropertyImages, toggleSavedProperty as toggleSavedPropertyService, getUsersBySavedProperty as getUsersBySavedPropertyService, getSavedPropertiesForUser as getSavedPropertiesForUserService, createPropertyLog } from '@/services/properties';
import { createAgency as createAgencyService, updateAgency as updateAgencyService, deleteAgency as deleteAgencyService } from '@/services/agency-service';
import { createAgencyAgentMap as createAgencyAgentMapService, getAgencyAgentAccountsByAgency as getAgencyAgentAccountsByAgencyService, getAgencyAgentMaps, getAgencyAgentMapsByAgent as getAgencyAgentMapsByAgentService, getAgencyAgentMapsByAgency as getAgencyAgentMapsByAgencyService } from '@/services/agency-agent-map-service';
import { getAgentsByLocation as getAgentsByLocationService, createAgent as createAgentService, updateAgent as updateAgentService, deleteAgent as deleteAgentService } from '@/services/agent-service';
import { addSitemap, getNewUrlsFromSitemap, processSitemapUrl, updateSitemapCheckedTime } from "@/services/sitemap-service";
import { logger } from "@neup/logica/logger";
import type { NaturalLanguageSearchOutput, Property, CreatePropertyInput, UpdatePropertyInput, CreateAgencyInput, UpdateAgencyInput, PropertyApprovalResult, CreatePropertyFormValues, UpdatePropertyFormValues, CreateAgencyFormValues, UpdateAgencyFormValues, PropertyFilters, ExtractedPropertyData, SitemapLog, PropertyAmendmentResult, RewritePropertyDetailsOutput, PropertyAssuranceResult, Agent, CreateAgentFormValues, UpdateAgentFormValues, StructuredLocation, CreateConversationFormValues, CreateUserActivityInput, PropertyImageUpdateResult, CreateFaqFormValues, UpdateFaqFormValues, CreateInquiryFormValues, InquiryStatus, UpdatePromptFormValues, CreatePromptFormValues, User, CreatePropertyRequestFormValues, CreateSalesRequestFormValues, CreateVisitRequestFormValues, CreateMortgageRequestFormValues, PropertyActivityEvent, UserPreferences, AIModel, CreateAIModelFormValues, UpdateAIModelFormValues, CreateRequirementFormValues, Requirement, UpdateUserFormValues, LandDetails, PlotDetails, ApartmentUnit } from "@/types";
import { CreatePropertySchema, UpdatePropertySchema, CreateAgencySchema, UpdateAgencySchema, PropertyPurposeSchema, PropertyCategorySchema, PropertyUsageTypeSchema, CreateAgentSchema, UpdateAgentSchema, CreateConversationSchema, CreateFaqSchema, UpdateFaqSchema, CreateInquirySchema, UpdatePromptSchema, CreatePromptSchema, CreatePropertyRequestSchema, CreateSalesRequestSchema, CreateVisitRequestSchema, CreateMortgageRequestSchema, CreateAIModelSchema, UpdateAIModelSchema, CreateRequirementSchema, UpdateUserSchema, areaValueToSqft } from "@/types";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { runPropertyApproval as runPropertyApprovalFlow } from "@/services/ai/property-approval-flow";
import { runPropertyAmendment as runPropertyAmendmentFlow } from "@/services/ai/property-amendment-flow";
import { runPropertyAssurance as runPropertyAssuranceFlow } from "@/services/ai/property-assurance-flow";
import { rewritePropertyDetails } from "@/services/ai/rewrite-property-details-flow";
import { parseAdminFilter } from "@/services/ai/parse-admin-filter-flow";
import { createMessage as createMessageService, createConversation as createConversationService, deleteConversation as deleteConversationService, getConversationById, getMessagesByConversationId, setAiIntervention as setAiInterventionService } from '@/services/conversation-service';
import { generateFollowUpMessages } from '@/services/ai/ai-follow-up-flow';
import { suggestQuestions as suggestQuestionsFlow } from '@/services/ai/suggest-questions-flow';
import { getAccountPreferences } from '@/services/accounts/single/preferences';
import { createFaq as createFaqService, updateFaq as updateFaqService, deleteFaq as deleteFaqService } from '@/services/faq-service';
import { updatePrompt as updatePromptService, createPrompt as createPromptService, deletePrompt as deletePromptService } from '@/services/prompt-service';
import { createPropertyRequest as createPropertyRequestService, createInquiry as createInquiryService, updateInquiryStatus as updateInquiryStatusService } from '@/services/property-request-service';
import { createSalesRequest as createSalesRequestService } from '@/services/sales-request-service';
import { createVisitRequest as createVisitRequestService } from '@/services/properties/single/engage/visit';
import { createMortgageRequest as createMortgageRequestService } from '@/services/mortgage-request-service';
import { createModel as createModelService, updateModel as updateModelService, deleteModel as deleteModelService, setDefaultModel as setDefaultModelService } from '@/services/model-service';
import { createRequirement as createRequirementService, updateRequirement as updateRequirementService } from '@/services/requirements-service';
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
    await createMessageService(conversationId, messageText, 'agent');
    revalidatePath(`/manage/messages/${conversationId}`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to send message." };
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
    await logger().type('createConversationAction').data({ error: String(e), details: {} }).log();
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
        await logger().type(`deleteConversationAction (ID: ${conversationId})`).data({ error: String(e), details: {} }).log();
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
    await logger().type(`deleteAccountAction (ID: ${accountId})`).data({ error: String(e), details: {} }).log();
    return { success: false, error: 'Failed to delete account.' };
  }
}

export async function setAiInterventionAction(conversationId: string, active: boolean) {
  try {
    await setAiInterventionService(conversationId, active);
    revalidatePath(`/manage/messages/${conversationId}`);
    return { success: true };
  } catch (e: any) {
    await logger().type(`setAiInterventionAction (ID: ${conversationId})`).data({ error: String(e), details: {} }).log();
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

    for (const messageText of aiResult.messages) {
      await createMessageService(conversationId, messageText, 'agent');
      await delay(1500);
    }
    
    revalidatePath(`/manage/messages/${conversationId}`);
    return { success: true, messagesSent: aiResult.messages.length };

  } catch (e: any) {
    await logger().type(`sendAiFollowUpAction (ID: ${conversationId})`).data({ error: String(e), details: {} }).log();
    return { success: false, error: e.message || 'An unknown error occurred while sending follow-ups.' };
  }
}
