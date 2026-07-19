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
import type { NaturalLanguageSearchOutput, Property, CreatePropertyInput, UpdatePropertyInput, CreateAgencyInput, UpdateAgencyInput, PropertyApprovalResult, CreatePropertyFormValues, UpdatePropertyFormValues, CreateAgencyFormValues, UpdateAgencyFormValues, PropertyFilters, ExtractedPropertyData, SitemapLog, PropertyAmendmentResult, RewritePropertyDetailsOutput, PropertyAssuranceResult, Agent, CreateAgentFormValues, UpdateAgentFormValues, StructuredLocation, CreateConversationFormValues, CreateUserActivityInput, PropertyImageUpdateResult, CreateFaqFormValues, UpdateFaqFormValues, CreateInquiryFormValues, InquiryStatus, UpdatePromptFormValues, CreatePromptFormValues, User, CreatePropertyRequestFormValues, CreateSalesRequestFormValues, CreateVisitRequestFormValues, CreateMortgageRequestFormValues, CreateContactSubmissionFormValues, PropertyActivityEvent, UserPreferences, AIModel, CreateAIModelFormValues, UpdateAIModelFormValues, CreateRequirementFormValues, Requirement, UpdateUserFormValues, LandDetails, PlotDetails, ApartmentUnit } from "@/types";
import { CreatePropertySchema, UpdatePropertySchema, CreateAgencySchema, UpdateAgencySchema, PropertyPurposeSchema, PropertyCategorySchema, PropertyUsageTypeSchema, CreateAgentSchema, UpdateAgentSchema, CreateConversationSchema, CreateFaqSchema, UpdateFaqSchema, CreateInquirySchema, UpdatePromptSchema, CreatePromptSchema, CreatePropertyRequestSchema, CreateSalesRequestSchema, CreateVisitRequestSchema, CreateMortgageRequestSchema, CreateContactSubmissionSchema, CreateAIModelSchema, UpdateAIModelSchema, CreateRequirementSchema, UpdateUserSchema, areaValueToSqft } from "@/types";
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
import { hasPermission, requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';
import { prisma } from '@/core/database/prisma';
import { isAgencyLikeAccountType, promoteStoredAccountType } from '@/services/account-type';
import { resolvePropertyPostingContext } from '@/services/property-posting-context';
import { requireIdentity, formatLocationString, firstPositivePrice, cleanPricing, deepMergeJson, normalizeOwnerEntries, normalizeOwnerReferenceEntries, normalizePropertyChangeData, mapPropertyToCreateFormValues } from '@/services/property/action-helpers';

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
