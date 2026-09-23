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
        await logger().type('addSitemapAction').data({ error: String(error), details: {} }).log();
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
        await logger().type('analyzeMarketAction').data({ error: String(e), details: {} }).log();
        return { success: false, error: "An unexpected error occurred during analysis." };
    }
}
