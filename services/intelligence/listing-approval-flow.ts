

'use server';

/**
 * @fileOverview An AI agent that verifies and approves property listings.
 *
 * - runPropertyApproval - A function that handles the property approval process.
 * - ListingApprovalResult - The return type for the approval function.
 */

import type { ListingApprovalResult } from '@/types';

async function propertyApprovalFlow(propertyId: string): Promise<ListingApprovalResult> {
    void propertyId;
    return { approved: false, reason: "Source-based property approval is disabled." };
}


export async function runListingApproval(propertyId: string): Promise<ListingApprovalResult> {
    return propertyApprovalFlow(propertyId);
}
