

// src/ai/flows/natural-language-property-search.ts
'use server';

/**
 * @fileOverview Implements natural language property search using Genkit.
 *
 * - naturalLanguagePropertySearch - A function that handles the natural language property search.
 * - NaturalLanguageSearchInput - The input type for the naturalLanguagePropertySearch function.
 * - NaturalLanguageSearchOutput - The return type for the naturalLanguagePropertySearch function.
 */

import {z} from 'zod';
import { NaturalLanguageSearchOutputSchema, type NaturalLanguageSearchOutput } from '@/types';
import { getPrompt } from '@/services/prompt-service';
import { generateText } from './unified-generation-service';

const NaturalLanguageSearchInputSchema = z.object({
  query: z.string().describe('The natural language query to search for properties.'),
});
export type NaturalLanguageSearchInput = z.infer<typeof NaturalLanguageSearchInputSchema>;

export async function naturalLanguagePropertySearch(input: NaturalLanguageSearchInput): Promise<NaturalLanguageSearchOutput> {
  return naturalLanguagePropertySearchFlow(input);
}

const PROMPT_ID = 'naturalLanguageSearchPrompt';
const defaultPrompt = {
    name: 'Natural Language Property Search',
    description: 'Parses a user\'s free-text search into structured filterable data.',
    placeholders: ['query'],
    promptText: `
You are a smart real estate query parser. Convert the user’s input into JSON with only these fields (in this order) if explicitly mentioned or the translation of the query in english strictly mentions it:

{
  "minPrice": number,
  "maxPrice": number,
  "listingPurpose": "sale" | "rent" | "lease",
  "category": "house" | "apartment" | "land" | "flat",
  "usageType": "residential" | "commercial" | "industrial" | "agricultural" | "semiCommercial",
  "space": {
    "bedroom": number,
    "bedroomAttached": number,
    "kitchenRoom": number,
    "diningRoom": number,
    "bathroom": number,
    "livingRoom": number,
    "bikeParking": number,
    "carParking": number
  },
  "tags": [string],
  "location": string,
  "propertyBy": "owner" | "agency" | "agent" | "developer" | "custom" | [company name] | [person name],
  "body": string
}

Rules:

> Include only fields present with exact words in the input or its translation; omit others.
> Prices:
  - Convert "3 crore", "30 lakh" to numbers.
  - "worth", "priced at", "valued at": set both minPrice & maxPrice.
  - "under"/"less than": set maxPrice only.
  - "above"/"more than": set minPrice only.
> Listing purpose:
  - "buy", "purchase", "for sale" → "sale"
  - "rent", "rental" → "rent"
  - "lease" → "lease"
> Category: exact "house", "apartment", "land", "flat" or aliases "home", "bungalow", "villa" → "house".
> UsageType: exact words only.
> Space: include only if exact space words appear with numbers.
> Tags: only explicit descriptive keywords; exclude words like "worth", "priced".
> Location: detect exact place names.
> propertyBy: exact "owner", "agency", "agent", "developer", "custom", or exact brand/company names.
> Any random strings, gibberish, or unrelated text should be returned as a string under the "body" field.

Now parse:
"{{query}}"

Return only valid JSON with populated fields in order.`,
};

async function naturalLanguagePropertySearchFlow(input: NaturalLanguageSearchInput): Promise<NaturalLanguageSearchOutput> {
    const promptConfig = await getPrompt(PROMPT_ID, defaultPrompt);
    return generateText<NaturalLanguageSearchOutput>({
        model: promptConfig.model!,
        promptText: promptConfig.promptText,
        inputData: input,
        outputSchema: NaturalLanguageSearchOutputSchema,
    });
}
