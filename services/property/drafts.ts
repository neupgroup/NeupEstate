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
import { logActivity as logActivityService, updateAccountAccessInfo } from '@/services/activity-service';
import { updateUserPreferences, getUserPreferences } from '@/services/user-preference-service';
import { createFaq as createFaqService, updateFaq as updateFaqService, deleteFaq as deleteFaqService } from '@/services/faq-service';
import { updatePrompt as updatePromptService, createPrompt as createPromptService, deletePrompt as deletePromptService } from '@/services/prompt-service';
import { createPropertyRequest as createPropertyRequestService, createInquiry as createInquiryService, updateInquiryStatus as updateInquiryStatusService } from '@/services/property-request-service';
import { createSalesRequest as createSalesRequestService } from '@/services/sales-request-service';
import { createVisitRequest as createVisitRequestService } from '@/services/visit-request-service';
import { createMortgageRequest as createMortgageRequestService } from '@/services/mortgage-request-service';
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

type PropertyChangeDraftStatus =
  | 'creation_draft'
  | 'creation_pending'
  | 'changing'
  | 'deleting';

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
  status?: string;
  accountId?: string;
  modifiedOn?: string;
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
      status: draft.status,
      accountId: draft.accountId,
      modifiedOn: draft.modifiedOn.toISOString(),
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
        attachedBathrooms: validatedData.attachedBathrooms ?? 0,
        homeOffices: validatedData.homeOffices ?? 0,
        libraries: validatedData.libraries ?? 0,
        studyRooms: validatedData.studyRooms ?? 0,
        meetingRooms: validatedData.meetingRooms ?? 0,
        guestRooms: validatedData.guestRooms ?? 0,
        workersCabins: validatedData.workersCabins ?? 0,
        poojaRooms: validatedData.poojaRooms ?? 0,
        storeRooms: validatedData.storeRooms ?? 0,
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
