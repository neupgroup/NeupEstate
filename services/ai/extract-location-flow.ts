
'use server';

/**
 * @fileOverview An AI agent that extracts and corrects a property's location from its details.
 *
 * - extractCorrectedLocation - A function to handle the location extraction.
 */

import { z } from 'zod';
import { getPrompt } from '@/services/prompt-service';
import { generateText } from './unified-generation-service';

const ExtractLocationInputSchema = z.object({
    title: z.string().describe("The title of the property listing."),
    description: z.string().describe("The description of the property listing."),
    location: z.string().optional().describe("The current, potentially incomplete or empty, location field."),
});

const ExtractLocationOutputSchema = z.object({
    correctedLocation: z.string().describe("The corrected and complete location string."),
});

const PROMPT_ID = 'extractLocationPrompt';
const defaultPrompt = {
    name: 'Extract & Correct Location',
    description: 'Determines the most accurate location from property title and description.',
    placeholders: ['title', 'description', 'location'],
    promptText: `You are an expert data analyst specializing in real estate listings. Your task is to determine the most accurate and complete location (e.g., "City, State" or "Neighborhood, City, Country") for a property based on its title, description, and existing location field.

The provided 'location' field may be empty, partial, or incorrect. Use the 'title' and 'description' as the primary source of truth to correct it.

- Title: {{{title}}}
- Description: {{{description}}}
- Current Location Field: {{{location}}}

Analyze the information and return the single, most accurate location string in the 'correctedLocation' field. If you cannot confidently determine a better location from the title or description, return the original content of the 'location' field.
`,
};


async function extractLocationFlow(input: z.infer<typeof ExtractLocationInputSchema>): Promise<z.infer<typeof ExtractLocationOutputSchema>> {
    const promptConfig = await getPrompt(PROMPT_ID, defaultPrompt);
    return generateText<z.infer<typeof ExtractLocationOutputSchema>>({
        model: promptConfig.model!,
        promptText: promptConfig.promptText,
        inputData: input,
        outputSchema: ExtractLocationOutputSchema,
    });
}

export async function extractCorrectedLocation(input: z.infer<typeof ExtractLocationInputSchema>): Promise<string> {
    const result = await extractLocationFlow(input);
    return result.correctedLocation;
}
