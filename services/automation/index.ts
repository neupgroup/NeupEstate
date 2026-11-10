"use server";

import { getAwaitingReviewItems, getPaginatedListings } from '@/services/listings';
import { addSitemap, getNewUrlsFromSitemap, processSitemapUrl, updateSitemapCheckedTime } from "@/services/crawl/sitemap";
import { logger } from "@neup/logica/logger";
import { getDisplayConfiguration } from '@/services/preferences/display';
import type { ListingApprovalResult, ListingAmendmentResult, ListingAssuranceResult } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runListingApproval as runListingApprovalFlow } from "@/services/intelligence/listing-approval-flow";
import { runListingAmendment as runListingAmendmentFlow } from "@/services/intelligence/listing-amendment-flow";
import { runListingAssurance as runListingAssuranceFlow } from "@/services/intelligence/listing-assurance-flow";
import { parseAdminFilter } from "@/services/intelligence/parse-admin-filter-flow";

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
        revalidatePath('/manage/listings');
        revalidatePath('/listings');
    }
    return result;
}

export async function updateSitemapCheckedTimeAction(sitemapId: string) {
    await updateSitemapCheckedTime(sitemapId);
    revalidatePath('/manage/automation'); // Revalidate path to update last checked time
}


export async function runListingApproval(propertyId: string): Promise<ListingApprovalResult> {
    return runListingApprovalFlow(propertyId);
}

export async function runListingAmendment(propertyId: string): Promise<ListingAmendmentResult> {
    return runListingAmendmentFlow(propertyId);
}

export async function runListingAssurance(propertyId: string): Promise<ListingAssuranceResult> {
    return runListingAssuranceFlow(propertyId);
}

export async function getPendingListingsForAgent(limit: number): Promise<{ id: string; title: string; kind: 'property' | 'draft'; propertyId?: string; requestId?: string }[]> {
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

export async function getApprovedListingsForAgent(limit: number): Promise<{ id:string; title: string }[]> {
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

        const { listings } = await getPaginatedListings({ filters, limit: 10000 });

        if (listings.length === 0) {
            return { success: true, result: { count: 0, averagePrice: 0, minPrice: 0, maxPrice: 0, summary: `No matching properties found for "${query}". Try a different description.` } };
        }

        const { usdRates } = await getDisplayConfiguration();
        const prices = listings
            .map((property) => {
                const amount = property.price.amount ?? 0;
                const currency = property.price.currency?.toUpperCase() || 'NPR';
                const rate = usdRates[currency];
                return amount > 0 && rate ? amount / rate : 0;
            })
            .filter((price) => price > 0);
        if (prices.length === 0) {
            return { success: true, result: { count: listings.length, averagePrice: 0, minPrice: 0, maxPrice: 0, summary: "Found matching properties, but none have a listed price to analyze." } };
        }

        const totalCount = listings.length;
        const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        const summary = `Based on ${totalCount} properties matching your description, the converted market range and average are shown below.`;

        return { success: true, result: { count: totalCount, averagePrice, minPrice, maxPrice, summary }};
    } catch(e: any) {
        await logger().type('analyzeMarketAction').data({ error: String(e), details: {} }).log();
        return { success: false, error: "An unexpected error occurred during analysis." };
    }
}
