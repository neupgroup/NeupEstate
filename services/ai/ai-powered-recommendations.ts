

'use server';

/**
 * @fileOverview An AI agent that analyzes user preferences to generate targeted property search filters.
 *
 * - recommendProperties - A function that handles the filter generation process.
 */

import { z } from 'zod';
import { getPrompt } from '@/services/prompt-service';
import type { RecommendPropertiesInput, RecommendPropertiesOutput } from '@/types';
import { RecommendPropertiesInputSchema, RecommendPropertiesOutputSchema } from '@/types';
import { generateText } from './unified-generation-service';


export async function recommendProperties(input: RecommendPropertiesInput): Promise<RecommendPropertiesOutput> {
  return recommendPropertiesFlow(input);
}

const PROMPT_ID = 'recommendPropertiesPrompt';
const defaultPrompt = {
    name: 'AI Recommendation Filter Generator',
    description: 'Analyzes user preference data and generates targeted search filters.',
    placeholders: ['userPreferences'],
    promptText: `You are an expert real estate data analyst. Your task is to analyze a user's preference profile, which contains weighted scores for different property attributes based on their activity (views, saves, inquiries, etc.).

Your goal is to synthesize this data into a few (1 to 3) targeted search filter objects that can be used to query a property database. Do not just return the top-ranked item in each category. Instead, look for meaningful combinations and create a few distinct "personas" or search intents for the user.

**User Preference Data:**
\`\`\`json
{{{userPreferences}}}
\`\`\`

**Instructions:**
1.  **Analyze the Data**: Review the user's weighted preferences across all categories (location, property type, budget, etc.). Higher scores indicate stronger preferences.
2.  **Identify Core Interests**: Determine the 1 to 3 most likely search intents. For example, a user might be looking for "a family house in Kathmandu" and also "commercial land for investment". These would be two separate filter objects.
3.  **Construct Filter Objects**: For each identified interest, create a JSON object that matches the PropertyFilters schema.
    *   **Location**: Use the highest-scored location.
    *   **Budget**: If budget ranges are present, select the one with the highest score and set \`minPrice\` and \`maxPrice\` accordingly.
    *   **Property Type/Category**: Select the highest-scored types and categories.
    *   **Purpose**: Select the most likely purpose (e.g., 'Sale', 'Rent').
    *   **Bedrooms/Bathrooms**: If the data contains preferences for these, use the highest-scored values.
4.  **Return the Filters**: Your final output must be a JSON object containing a single key, "filters", which is an array of your 1 to 3 generated filter objects.

**Example Output:**
\`\`\`json
{
  "filters": [
    {
      "location": "Kathmandu",
      "category": ["House"],
      "purpose": ["Sale"],
      "bedrooms": 4
    },
    {
      "location": "Pokhara",
      "category": ["Land"],
      "type": ["Commercial"]
    }
  ]
}
\`\`\`

Now, analyze the provided user preference data and generate the search filters.`,
};

/**
 * This is now a lightweight wrapper that uses the new unified generation service.
 */
async function recommendPropertiesFlow(input: RecommendPropertiesInput): Promise<RecommendPropertiesOutput> {
    const promptConfig = await getPrompt(PROMPT_ID, defaultPrompt);

    const result = await generateText<RecommendPropertiesOutput>({
        model: promptConfig.model!,
        promptText: promptConfig.promptText,
        inputData: { userPreferences: JSON.stringify(input, null, 2) },
        outputSchema: RecommendPropertiesOutputSchema,
    });
    
    return result;
}
