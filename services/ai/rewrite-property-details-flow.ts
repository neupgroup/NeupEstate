

'use server';

/**
 * @fileOverview An AI agent that rewrites property details to be more engaging and generates SEO metadata.
 *
 * - rewritePropertyDetails - A function that handles the rewriting process.
 */

import { ai } from '@/ai/genkit';
import {
  RewritePropertyDetailsInputSchema,
  type RewritePropertyDetailsInput,
  RewritePropertyDetailsOutputSchema,
  type RewritePropertyDetailsOutput,
} from '@/types';
import { getPrompt } from '@/services/prompt-service';
import { generateText } from './unified-generation-service';

const PROMPT_ID = 'rewritePropertyDetailsPrompt';
const defaultPrompt = {
    name: 'Rewrite Property Details & SEO',
    description: 'Rewrites property details to be more engaging and generates SEO metadata.',
    placeholders: ['title', 'description', 'location', 'existingSlug'],
    promptText: `You are an expert real estate copywriter and SEO specialist. Your task is to rewrite the given property details to be professional and appealing, and to generate optimized SEO metadata.

  Current Title: {{{title}}}
  Current Description: {{{description}}}
  Current Location: {{{location}}}

  Please adhere to the following guidelines:
  - **Title**: Rewrite the title to be catchy and descriptive, highlighting a key feature.
  - **Description**: Rewrite the description to be more fluent and enticing. Structure it into a few short paragraphs. Correct any grammar or spelling mistakes. Do not invent new facts or features.
  - **Location**: Standardize the location format to 'City, State' or 'City, Country' if possible, based on the input.
  - **Meta Title**: Generate an SEO-optimized meta title. It must be under 60 characters and include key details and the location.
  - **Meta Description**: Generate an SEO-optimized meta description. It must be a compelling summary under 160 characters.
  - **Meta Tags**: Generate a list of 5-10 relevant SEO keywords and tags based on all property details.
  - **Slug**: {{#if existingSlug}}The property already has a slug, so you do not need to generate a new one. Omit the 'generatedSlug' field.{{else}}Generate a URL-friendly slug from the title and location. It should be lowercase, kebab-case (words separated by hyphens), and contain no special characters other than hyphens. Do not include the property ID in your output; it will be appended later.{{/if}}

  Return the rewritten content and all generated SEO fields in the specified JSON format.`,
};

async function rewritePropertyDetailsFlow(input: RewritePropertyDetailsInput): Promise<RewritePropertyDetailsOutput> {
    const promptConfig = await getPrompt(PROMPT_ID, defaultPrompt);
    return generateText<RewritePropertyDetailsOutput>({
        model: promptConfig.model!,
        promptText: promptConfig.promptText,
        inputData: input,
        outputSchema: RewritePropertyDetailsOutputSchema,
    });
}

export async function rewritePropertyDetails(input: RewritePropertyDetailsInput): Promise<RewritePropertyDetailsOutput> {
  return rewritePropertyDetailsFlow(input);
}
