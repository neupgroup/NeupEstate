

'use server';

/**
 * @fileOverview An AI agent that verifies and approves property listings.
 *
 * - runPropertyApproval - A function that handles the property approval process.
 * - PropertyApprovalResult - The return type for the approval function.
 */

import { ai } from '@/logica/core/ai/genkit';
import { z } from 'zod';
import { PropertyApprovalResultSchema, type PropertyApprovalResult } from '@/types';

const ApprovalInputSchema = z.object({
    propertyId: z.string(),
});
const propertyApprovalFlow = ai.defineFlow(
    {
        name: 'propertyApprovalFlow',
        inputSchema: ApprovalInputSchema,
        outputSchema: PropertyApprovalResultSchema,
    },
    async ({ propertyId }) => {
        void propertyId;
        return { approved: false, reason: "Source-based property approval is disabled." };
    }
);


export async function runPropertyApproval(propertyId: string): Promise<PropertyApprovalResult> {
    return propertyApprovalFlow({ propertyId });
}
