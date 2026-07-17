

'use server';

/**
 * @fileOverview An AI agent that verifies and approves property listings.
 *
 * - runPropertyApproval - A function that handles the property approval process.
 * - PropertyApprovalResult - The return type for the approval function.
 */

import type { PropertyApprovalResult } from '@/types';

async function propertyApprovalFlow(propertyId: string): Promise<PropertyApprovalResult> {
    void propertyId;
    return { approved: false, reason: "Source-based property approval is disabled." };
}


export async function runPropertyApproval(propertyId: string): Promise<PropertyApprovalResult> {
    return propertyApprovalFlow(propertyId);
}
