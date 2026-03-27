

'use server';

/**
 * @fileOverview An AI agent that parses a natural language query from an admin into structured filter criteria for properties.
 *
 * - parseAdminFilter - A function that handles parsing the filter query.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { PropertyFiltersSchema, type PropertyFilters } from '@/types';
import { getPrompt } from '@/services/prompt-service';
import { generateText } from './unified-generation-service';

const AdminFilterInputSchema = z.object({
  query: z.string().describe('The natural language query from the admin user.'),
});
export type AdminFilterInput = z.infer<typeof AdminFilterInputSchema>;

const AdminFilterOutputSchema = PropertyFiltersSchema.describe('The structured filter criteria parsed from the admin\'s query.');

const PromptInputSchema = AdminFilterInputSchema.extend({
  currentDate: z.string().describe("Today's date in ISO 8601 format."),
});

export async function parseAdminFilter(input: AdminFilterInput): Promise<PropertyFilters> {
  return parseAdminFilterFlow(input);
}

const PROMPT_ID = 'parseAdminFilterPrompt';
const defaultPrompt = {
    name: 'Parse Admin Filter Query',
    description: 'Converts an admin\'s natural language search into structured property filters.',
    placeholders: ['query', 'currentDate'],
    promptText: `You are an expert data analyst assistant. An admin user will provide a natural language query to filter a list of properties.
  Your task is to parse this query into a structured JSON object.

  Here are the parsing rules:
  - Status: "approved", "live", "published" should map to status: "approved". "pending", "unapproved", "draft" should map to status: "pending".
  - Purpose: "for sale" maps to purpose: ["Sale"]. "for rent" or "rental" maps to purpose: ["Rent"]. "for lease" maps to purpose: ["Lease"].
  - Category: Parse terms like "house", "apartment", "land", "flat". The output for 'category' must be one of 'House', 'Apartment', 'Land', 'Flat'.
  - Type: Parse terms like "residential", "commercial", "industrial", "agricultural". The output for 'type' must be one of 'Residential', 'Commercial', 'Industrial', 'Agricultural', 'Vacant', 'Semi-Commercial'.
  - Price: Extract minPrice and maxPrice. "under $500k" means maxPrice: 500000. "over 1M" means minPrice: 1000000. "around $200k" or "approximately 200k" should be a +/- 10% range (e.g., for 200k, minPrice: 180000, maxPrice: 220000).
  - Area: Extract minArea and maxArea from queries like "between 1000 and 1500 sqft".
  - Location: Extract location if mentioned (e.g., "in Austin, TX").
  - Agency: Extract agency name from "by agency X" or "from Horizon Realty" into the 'agencyName' field.
  - Listing Agent: Extract agent name from "by agent Jane Doe" into the 'listingAgent' field.
  - Posted by Owner: If the query mentions "by owner" or "owner listing", set isOwnerListing to true.
  - Dates: For queries like "posted last week", "posted in the last month", "posted yesterday", or "between Jan 1 2024 and Feb 15 2024", calculate the date range and provide 'postedAfter' and 'postedBefore' fields. The dates MUST be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ). Today's date is {{currentDate}}.
  - Search Term: Any text that doesn't fit into a specific field (like "modern loft" or "waterfront view") should be put into the 'searchTerm' field.

  Admin Query: "{{query}}"

  Return the parsed filter as a JSON object. If a field isn't mentioned, omit it from the object.`,
};


async function parseAdminFilterFlow(input: AdminFilterInput): Promise<PropertyFilters> {
    const promptConfig = await getPrompt(PROMPT_ID, defaultPrompt);
    const currentDate = new Date().toISOString();
    return generateText<PropertyFilters>({
        model: promptConfig.model!,
        promptText: promptConfig.promptText,
        inputData: { ...input, currentDate },
        outputSchema: AdminFilterOutputSchema,
    });
}
