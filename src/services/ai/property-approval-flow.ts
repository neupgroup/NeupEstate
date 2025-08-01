

'use server';

/**
 * @fileOverview An AI agent that verifies and approves property listings.
 *
 * - runPropertyApproval - A function that handles the property approval process.
 * - PropertyApprovalResult - The return type for the approval function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { approveProperty, getPropertyById } from '@/services/property-service';
import { PropertyApprovalResultSchema, type PropertyApprovalResult } from '@/types';
import { fetchPageContent } from '@/services/activities/fetch-page-content';
import { getPrompt } from '@/services/prompt-service';

const ApprovalInputSchema = z.object({
    propertyId: z.string(),
});
type ApprovalInput = z.infer<typeof ApprovalInputSchema>;

export type { PropertyApprovalResult };

const AIVerificationOutputSchema = z.object({
    isDataConsistent: z.boolean().describe("Whether the stored data accurately reflects the live web page content."),
    reason: z.string().describe("A brief, one-sentence summary of the findings. E.g., 'Data is consistent' or 'Found 3 inconsistencies in price, title, and amenities.'"),
    changes: z.array(z.object({
        field: z.string().describe("The name of the property field that has changed."),
        storedValue: z.string().describe("The value of the field as stored in our database."),
        liveValue: z.string().describe("The value of the field as found on the live webpage."),
    })).optional().describe("A detailed list of inconsistencies found between the stored data and the live page. Omit if no changes are found."),
});

const PROMPT_ID = 'propertyApprovalPrompt';
const defaultPrompt = {
    name: 'Property Approval Agent',
    description: 'Verifies pending properties by checking their live source URL for consistency.',
    placeholders: ['storedData', 'sourceUrl'],
    promptText: `You are an AI data verification specialist for a real estate website. Your job is to compare a property listing we have stored against the live data from its original source URL.

    Here is the data we have stored in our database:
    \`\`\`json
    {{{storedData}}}
    \`\`\`

    Use the \`fetchPageContent\` tool with the URL \`{{{sourceUrl}}}\` to get the live HTML of the page.

    From the live HTML, extract the equivalent data for all fields present in our stored data. Then, perform a field-by-field comparison. Be meticulous. Check price, title, description, location, bedrooms, bathrooms, area, amenities, listing status (e.g., is it marked as "sold" or "off-market"?), etc.

    - If all fields match, set \`isDataConsistent\` to \`true\` and provide a simple reason like "Data is consistent with live source."
    - If you find ANY inconsistencies (e.g., price changed, description updated, amenities added/removed, property is no longer available), set \`isDataConsistent\` to \`false\`.
    - For each inconsistency, create an entry in the \`changes\` array detailing the field name, our stored value, and the new value you found on the live page. If a field exists in our data but not on the live page, note that. If a new field is available on the live page, note that as well.
    - The \`reason\` field should be a concise summary of your findings (e.g., "Found inconsistencies in price and description.").

    Return your findings in the specified JSON format.`,
};

const propertyApprovalFlow = ai.defineFlow(
    {
        name: 'propertyApprovalFlow',
        inputSchema: ApprovalInputSchema,
        outputSchema: PropertyApprovalResultSchema,
    },
    async ({ propertyId }) => {
        const property = await getPropertyById(propertyId);

        if (!property) {
            return { approved: false, reason: "Property not found in database." };
        }
        if (property.isApproved) {
            return { approved: false, reason: "Property is already approved." };
        }
        if (!property.sourceUrl) {
            return { approved: false, reason: "Property has no source URL to verify against." };
        }
        
        const promptConfig = await getPrompt(PROMPT_ID, defaultPrompt);
        const approvalPrompt = ai.definePrompt({
            name: PROMPT_ID,
            input: { schema: z.object({
                    storedData: z.string(),
                    sourceUrl: z.string().url(),
                })},
            output: { schema: AIVerificationOutputSchema },
            tools: [fetchPageContent],
            prompt: promptConfig.promptText,
            model: promptConfig.model,
        });

        const { output } = await approvalPrompt({
            storedData: JSON.stringify(property, null, 2),
            sourceUrl: property.sourceUrl,
        });

        if (!output) {
            return { approved: false, reason: "AI verification failed to produce a result." };
        }

        if (output.isDataConsistent) {
            await approveProperty(propertyId);
            return { approved: true, reason: output.reason };
        } else {
            const detailedReason = [
                output.reason,
                ...(output.changes?.map(c => `  - ${c.field}: Stored ('${c.storedValue}') vs. Live ('${c.liveValue}')`) || [])
            ].join('\n');
            return { approved: false, reason: detailedReason };
        }
    }
);


export async function runPropertyApproval(propertyId: string): Promise<PropertyApprovalResult> {
    return propertyApprovalFlow({ propertyId });
}
