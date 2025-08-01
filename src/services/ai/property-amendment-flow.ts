

'use server';

/**
 * @fileOverview An AI agent that checks for and corrects inconsistencies in property listings.
 *
 * - runPropertyAmendment - A function that handles the property amendment process.
 * - PropertyAmendmentResult - The return type for the amendment function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getPropertyById, updatePropertyWithExtractedData } from '@/services/property-service';
import { PropertyAmendmentResultSchema, type PropertyAmendmentResult, ExtractedPropertySchema } from '@/types';
import { fetchPageContent } from '@/services/activities/fetch-page-content';
import { getPrompt } from '@/services/prompt-service';

const AmendmentInputSchema = z.object({
    propertyId: z.string(),
});
type AmendmentInput = z.infer<typeof AmendmentInputSchema>;

export type { PropertyAmendmentResult };

const AIVerificationOutputSchema = z.object({
    areChangesNeeded: z.boolean().describe("Set to true if you found any meaningful inconsistencies or missing details that require an update. Set to false if the stored data is accurate and complete."),
    reason: z.string().describe("A brief explanation for your decision. If changes are needed, describe what you are correcting (e.g., 'Price was updated from $X to $Y', 'Description was incomplete and has been expanded'). If no changes are needed, state that 'Data is consistent and complete'."),
    correctedData: ExtractedPropertySchema.optional().describe("If changes are needed, provide the full, corrected property data in this field. If no changes are needed, this field can be omitted.")
});

const PROMPT_ID = 'propertyAmendmentPrompt';
const defaultPrompt = {
    name: 'Property Amendment Agent',
    description: 'Corrects and enriches approved properties by checking their live source URL for updated details.',
    placeholders: ['storedData', 'sourceUrl'],
    promptText: `You are an AI assistant for a real estate website. Your primary task is to ensure our property listings are perfectly accurate by comparing our stored data against the live source webpage.

Your goal is to **find and correct any inconsistencies**, such as outdated prices, incorrect details (title, description, specs), or missing/outdated images. If the stored data is incomplete or incorrect in any way, you will perform a **full re-scrape** of the live page and provide a complete, corrected version of the property data.

**Stored Data in our Database:**
\`\`\`json
{{{storedData}}}
\`\`\`

**Instructions:**
1.  Use the "fetchPageContent" tool to get the full HTML content for the source URL: {{{sourceUrl}}}
2.  Carefully analyze the fetched HTML and compare it to our stored data.
3.  **Decision Point:**
    *   If the stored data is **already a perfect and complete match** with the live page, set \`areChangesNeeded\` to \`false\`.
    *   If you find **any meaningful discrepancy** (e.g., price change, different title, better description available, incorrect images), or if the stored data is incomplete, set \`areChangesNeeded\` to \`true\`.
4.  **If Changes are Needed:**
    *   Provide the **complete, fully corrected property data** in the \`correctedData\` field.
    *   This corrected data should be based **entirely on the live page**, replacing the old data.
    *   Pay special attention to images: the \`images\` array in your response should be a complete list of all correct images from the live page. Do not include old, incorrect image URLs. Ensure all image URLs are absolute.

Return your decision and the corrected data (if applicable) in the specified JSON format.`,
};


const propertyAmendmentFlow = ai.defineFlow(
    {
        name: 'propertyAmendmentFlow',
        inputSchema: AmendmentInputSchema,
        outputSchema: PropertyAmendmentResultSchema,
    },
    async ({ propertyId }) => {
        const property = await getPropertyById(propertyId);

        if (!property) {
            return { amended: false, reason: "Property not found in database." };
        }
        if (!property.sourceUrl) {
            return { amended: false, reason: "Property has no source URL to check against." };
        }

        const promptConfig = await getPrompt(PROMPT_ID, defaultPrompt);
        const amendmentPrompt = ai.definePrompt({
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

        const { output } = await amendmentPrompt({
            storedData: JSON.stringify(property, null, 2),
            sourceUrl: property.sourceUrl,
        });

        if (!output) {
            return { amended: false, reason: "AI verification failed to produce a result." };
        }

        if (output.areChangesNeeded && output.correctedData) {
            await updatePropertyWithExtractedData(propertyId, output.correctedData);
            return { amended: true, reason: output.reason };
        } else {
            return { amended: false, reason: output.reason };
        }
    }
);


export async function runPropertyAmendment(propertyId: string): Promise<PropertyAmendmentResult> {
    return propertyAmendmentFlow({ propertyId });
}
