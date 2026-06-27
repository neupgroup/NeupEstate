

'use server';

/**
 * @fileOverview An AI agent that checks for and corrects inconsistencies in property listings.
 *
 * - runPropertyAmendment - A function that handles the property amendment process.
 * - PropertyAmendmentResult - The return type for the amendment function.
 */

import { ai } from '@/logica/core/ai/genkit';
import { z } from 'zod';
import { PropertyAmendmentResultSchema, type PropertyAmendmentResult } from '@/types';

const AmendmentInputSchema = z.object({
    propertyId: z.string(),
});
const propertyAmendmentFlow = ai.defineFlow(
    {
        name: 'propertyAmendmentFlow',
        inputSchema: AmendmentInputSchema,
        outputSchema: PropertyAmendmentResultSchema,
    },
    async ({ propertyId }) => {
        void propertyId;
        return { amended: false, reason: "Source-based property amendment is disabled." };
    }
);


export async function runPropertyAmendment(propertyId: string): Promise<PropertyAmendmentResult> {
    return propertyAmendmentFlow({ propertyId });
}
