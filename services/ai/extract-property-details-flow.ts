'use server';

/**
 * @fileOverview An AI flow to extract property details from a webpage URL.
 * 
 * - extractAndSaveProperty - A function to handle fetching, extracting, and saving property details.
 * - ExtractPropertyDetailsInput - The input type for the flow.
 * - ExtractPropertyDetailsOutput - The return type for the flow.
 */

import { ai, resolveGoogleModel } from '@/ai/genkit';
import { z } from 'zod';
import { addProperty, updatePropertyWithExtractedData } from '@/services/property-service';
import { ExtractedPropertySchema } from '@/types';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';
import { getPrompt } from '@/services/prompt-service';

const ExtractPropertyDetailsInputSchema = z.object({
  url: z.string().url().describe('The URL of the property listing page.'),
  propertyIdToUpdate: z.string().optional().describe('If provided, update this property ID instead of creating a new one.'),
  saveToDb: z.boolean().default(true).describe('If false, will only extract data and not save to the database.'),
});
export type ExtractPropertyDetailsInput = z.infer<typeof ExtractPropertyDetailsInputSchema>;

const ExtractPropertyDetailsOutputSchema = z.object({
    propertyId: z.string().optional(),
    error: z.string().optional(),
    extractedData: ExtractedPropertySchema.optional(),
    rawHtml: z.string().optional(),
});
export type ExtractPropertyDetailsOutput = z.infer<typeof ExtractPropertyDetailsOutputSchema>;

const PROMPT_ID = 'extractPropertyPrompt';
const defaultPrompt = {
    name: 'Extract Property Details from HTML',
    description: 'Analyzes the HTML of a webpage to extract and structure property data.',
    placeholders: ['url', 'htmlContent'],
    promptText: `You are an expert real estate data analyst. Your primary task is to meticulously analyze the provided HTML content to extract property information with high accuracy. The HTML is from the URL: {{{url}}}

    **Step 1: Verification**
    First, critically analyze the HTML content to determine if it represents a real estate property listing for a single property. Set the \`isPropertyPage\` field to true ONLY if it is a detail page for one specific property. A page listing multiple properties is NOT a valid property page. If it is not a valid page, set \`isPropertyPage\` to false.

    **Step 2: Extraction (only if isPropertyPage is true)**
    If it is a valid property page, extract the following structured details. Be as accurate as possible. Do not guess or invent information.

    - **Title & Description**: Extract the main title and the full descriptive text of the property.
    - **Price**: Find the numeric price. If the price is listed as "negotiable", "on-call", or is not present, **you must omit the 'price' field from the output**. The value must be a number, without currency symbols.
    - **Location**: Extract the address or general location.
    - **Specifications**: Extract number of bedrooms, bathrooms, and the area (in square feet). If a value is not found, default it to \`0\`.
    - **Property & Listing Information**:
        - Identify the 'purpose' as 'Sale', 'Rent', or 'Lease'.
        - Identify the 'category' from: 'House', 'Apartment', 'Land', 'Flat'. Default to 'House' if unclear.
        - Identify the 'type' from: 'Residential', 'Commercial', 'Industrial', 'Agricultural', 'Vacant', 'Semi-Commercial'. Default to 'Residential' if unclear.
    - **Agent & Ownership**:
        - Look for a 'listingAgent' name. If none is found, omit the field.
        - Determine if it is an 'isOwnerListing'. Default to false.
    - **Extra Details**: Extract 'floors' and 'roadAccess' width (in feet). If a value is not found, omit the field.
    - **Amenities**: List all available amenities.
    - **Images**: Scrape all relevant property image URLs.
        - The URLs MUST be full, absolute URLs (e.g., "https://...").
        - If you find relative URLs (e.g., "/images/prop.jpg"), you MUST convert them to absolute URLs based on the source URL ({{{url}}}).
        - The primary image (first in the array) should be the most representative one.
        - Filter out logos, icons, or agent photos. Only include images of the property itself.
    
    Return the extracted data in the specified JSON format. High accuracy is critical. **For any optional field, if you cannot find a value, omit the field entirely from the JSON object instead of using \`null\`**.

    Here is the HTML Content to analyze:
    \`\`\`html
    {{{htmlContent}}}
    \`\`\`
    `,
};


const extractPropertyDetailsFlow = ai.defineFlow(
  {
    name: 'extractPropertyDetailsFlow',
    inputSchema: ExtractPropertyDetailsInputSchema,
    outputSchema: ExtractPropertyDetailsOutputSchema,
  },
  async (input) => {
    let rawHtml;
    try {
        rawHtml = await fetchPageSourceCode(input.url);
    } catch (e: any) {
        // The error is already logged by fetchPageSourceCode.
        // Just return it to the action.
        return { error: e.message || 'Failed to fetch HTML content from the page.' };
    }

    const promptConfig = await getPrompt(PROMPT_ID, defaultPrompt);
    const extractPropertyPrompt = ai.definePrompt({
        name: PROMPT_ID,
        input: { schema: z.object({ url: z.string().url(), htmlContent: z.string() }) },
        output: { schema: ExtractedPropertySchema },
        prompt: promptConfig.promptText,
        model: resolveGoogleModel(promptConfig.model),
    });

    const { output } = await extractPropertyPrompt({ url: input.url, htmlContent: rawHtml });

    if (!output) {
      return { error: 'Failed to extract property details from the page.', rawHtml };
    }

    if (!output.isPropertyPage) {
      return { error: 'The provided URL does not appear to be a property listing.', extractedData: output, rawHtml };
    }

    const dataWithSource = { ...output, sourceUrl: input.url };

    const shouldSaveToDb = input.saveToDb !== false;

    if (!shouldSaveToDb) {
        return { extractedData: dataWithSource, rawHtml };
    }

    try {
      if (input.propertyIdToUpdate) {
        await updatePropertyWithExtractedData(input.propertyIdToUpdate, dataWithSource);
        return { propertyId: input.propertyIdToUpdate, extractedData: dataWithSource, rawHtml };
      } else {
        const propertyId = await addProperty({ ...dataWithSource });
        return { propertyId, extractedData: dataWithSource, rawHtml };
      }
    } catch (error: any) {
      return { error: error.message || 'Failed to save property to database.', extractedData: dataWithSource, rawHtml };
    }
  }
);


export async function extractAndSaveProperty(input: ExtractPropertyDetailsInput): Promise<ExtractPropertyDetailsOutput> {
    return extractPropertyDetailsFlow(input);
}
