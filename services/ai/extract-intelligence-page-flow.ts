'use server';

import { ai, resolveGoogleModel } from '@/logica/core/ai/genkit';
import { z } from 'zod';

const IntelligencePageInputSchema = z.object({
  url: z.string().url(),
  htmlContent: z.string(),
});

export type IntelligencePageInput = z.infer<typeof IntelligencePageInputSchema>;

const IntelligencePageOutputSchema = z.object({
  success: z.boolean(),
  reason: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  purpose: z.enum(['Sale', 'Rent', 'Lease']).optional(),
  category: z.enum(['House', 'Apartment', 'Land', 'Flat']).optional(),
  type: z.enum(['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Vacant', 'Semi-Commercial']).optional(),
  price: z.number().optional(),
  location: z.string().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  area: z.number().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  listingAgent: z.string().optional(),
  isOwnerListing: z.boolean().optional(),
  floors: z.number().optional(),
  roadAccess: z.number().optional(),
});

export type IntelligencePageOutput = z.infer<typeof IntelligencePageOutputSchema>;

const PROMPT_ID = 'extractIntelligencePagePrompt';

const defaultPrompt = {
  name: 'Extract Intelligence Page',
  description: 'Determines whether a crawled page should be logged as a property and extracts structured listing data.',
  placeholders: ['url', 'htmlContent'],
  promptText: `You are a real-estate page classifier and extractor.

You will receive a rendered HTML page for the URL: {{{url}}}

Decide first whether the page should be logged as a property page.

Rules:
- If the page is not a single property detail page, return JSON with:
  - success: false
  - reason: a short explanation
- If the page is a single property detail page, return JSON with:
  - success: true
  - title, description, purpose, category, type, price, location, bedrooms, bathrooms, area, amenities, images, listingAgent, isOwnerListing, floors, roadAccess
- Do not invent data.
- If a field cannot be determined, omit it.
- If a page is explicitly not meant to be logged based on the crawl rule context, that will be handled before this prompt.
- Return only valid JSON.

HTML:
\`\`\`html
{{{htmlContent}}}
\`\`\`
  `,
};

const extractIntelligencePagePrompt = ai.definePrompt({
  name: PROMPT_ID,
  input: { schema: IntelligencePageInputSchema },
  output: { schema: IntelligencePageOutputSchema },
  prompt: defaultPrompt.promptText,
  model: resolveGoogleModel(),
});

const flow = ai.defineFlow(
  {
    name: 'extractIntelligencePageFlow',
    inputSchema: IntelligencePageInputSchema,
    outputSchema: IntelligencePageOutputSchema,
  },
  async (input) => {
    const { output } = await extractIntelligencePagePrompt(input);
    if (!output) {
      return { success: false, reason: 'AI did not return a usable JSON response.' };
    }

    return output;
  },
);

export async function extractIntelligencePage(input: IntelligencePageInput): Promise<IntelligencePageOutput> {
  return flow(input);
}
