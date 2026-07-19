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
import { createLead as createLeadService, createLeadActivity as createLeadActivityService } from '@/services/leads/create';
import { getIdentity } from '@/services/neupid/get-identity';
import { hasPermission, requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';
import { prisma } from '@/core/database/prisma';
import { isAgencyLikeAccountType, promoteStoredAccountType } from '@/services/account-type';
import { resolvePropertyPostingContext } from '@/services/property-posting-context';
import { requireIdentity, formatLocationString, firstPositivePrice, cleanPricing, deepMergeJson, normalizeOwnerEntries, normalizeOwnerReferenceEntries, normalizePropertyChangeData, mapPropertyToCreateFormValues } from '@/services/property/action-helpers';

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
