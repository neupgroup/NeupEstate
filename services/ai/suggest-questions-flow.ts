

'use server';

/**
 * @fileOverview An AI agent that suggests relevant questions about a property.
 *
 * - suggestQuestions - A function that handles suggesting questions.
 * - SuggestQuestionsInput - The input type for the suggestQuestions function.
 * - SuggestQuestionsOutput - The return type for the suggestQuestions function.
 */

import { z } from 'zod';
import { getPrompt } from '@/services/prompt-service';
import { generateText } from './unified-generation-service';

const SuggestQuestionsInputSchema = z.object({
  propertyTitle: z.string().describe("The title of the property listing."),
  propertyDescription: z.string().describe("The description of the property."),
  propertyPurpose: z.string().describe("The purpose of the listing, e.g., 'Sale' or 'Rent'."),
});
export type SuggestQuestionsInput = z.infer<typeof SuggestQuestionsInputSchema>;

const SuggestQuestionsOutputSchema = z.object({
  questions: z.array(z.string()).max(4).describe("An array of 3 to 4 short, relevant questions a potential client might ask about this property."),
});
export type SuggestQuestionsOutput = z.infer<typeof SuggestQuestionsOutputSchema>;

const PROMPT_ID = 'suggestQuestionsPrompt';
const defaultPrompt = {
    name: 'Suggest Property Questions',
    description: 'Generates relevant questions a potential client might ask about a property.',
    placeholders: ['propertyPurpose', 'propertyTitle', 'propertyDescription'],
    promptText: `You are a helpful real estate assistant. Based on the following property details, generate a list of 3-4 short, insightful questions that a potential client might want to ask.

The questions should be relevant to the property's purpose ({{propertyPurpose}}). For example, for a 'Sale', questions about property taxes, negotiation, or mortgage options are good. For a 'Rent', questions about lease terms or utilities are better.

Avoid questions that are already answered in the description.

Property Title: {{{propertyTitle}}}
Property Description: {{{propertyDescription}}}

Generate the questions and return them in the specified JSON format.
`,
};


async function suggestQuestionsFlow(input: SuggestQuestionsInput): Promise<SuggestQuestionsOutput> {
    const promptConfig = await getPrompt(PROMPT_ID, defaultPrompt);
    return generateText<SuggestQuestionsOutput>({
        model: promptConfig.model!,
        promptText: promptConfig.promptText,
        inputData: input,
        outputSchema: SuggestQuestionsOutputSchema,
    });
}

export async function suggestQuestions(input: SuggestQuestionsInput): Promise<SuggestQuestionsOutput> {
    return suggestQuestionsFlow(input);
}
