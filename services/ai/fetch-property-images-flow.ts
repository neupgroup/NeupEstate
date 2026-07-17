
'use server';

/**
 * @fileOverview An AI flow to intelligently extract property images from a webpage URL.
 */

import { z } from 'zod';
import { fetchPageSourceCode } from '@/services/activities/fetch-page-source2';
import { logProblem } from '@/services/problem-service';
import { generateText } from '@/services/ai/unified-generation-service';

const FetchPropertyImagesInputSchema = z.object({
  url: z.string().url().describe('The URL of the property listing page.'),
});
export type FetchPropertyImagesInput = z.infer<typeof FetchPropertyImagesInputSchema>;

const FetchPropertyImagesOutputSchema = z.object({
    images: z.array(z.string().url()).optional(),
    error: z.string().optional(),
});
export type FetchPropertyImagesOutput = z.infer<typeof FetchPropertyImagesOutputSchema>;

// This prompt is specifically designed to be "smart" about finding only relevant images.
const imageExtractionPrompt = `You are an AI data scraper specializing in extracting property images from a live webpage. Your task is to analyze the page's HTML and return a list of absolute URLs for images that are clearly part of the main property gallery or listing.

**CRITICAL INSTRUCTIONS:**
1.  Analyze the provided HTML content for the source URL: {{{sourceUrl}}}
2.  **Analyze the HTML for Image URLs**:
    *   Prioritize images within containers that suggest a gallery (e.g., class names like \`gallery\`, \`carousel\`, \`slider\`, \`listing-photos\`).
    *   Look for lazy-loading attributes like \`data-src\`, \`data-lazy\`, \`data-srcset\` as they often hold the real image URL.
    *   Scrutinize JSON data within \`<script type="application/ld+json">\` or other script tags, as this is a common place for image galleries.
3.  **URL Correction**:
    *   **Absolute URLs ONLY**: Every URL in your output must be a full, absolute URL (e.g., "https://example.com/image.jpg").
    *   **Resolve Relative Paths**: If you find a relative path (e.g., \`/images/photo.jpg\`), you MUST convert it to an absolute URL using the source URL's origin. The source URL is {{{sourceUrl}}}.
4.  **Filtering (What to EXCLUDE)**:
    *   **IGNORE** images from the \`<footer>\`, \`<header>\`, or \`<nav>\` sections.
    *   **EXCLUDE** logos, icons, agent photos, user avatars, and map thumbnails.
    *   **EXCLUDE** any image that is clearly an advertisement or not part of the property itself.

Return a clean list of only the property image URLs in the \`images\` field. If no relevant images are found, return an empty array.

HTML:
\`\`\`html
{{{htmlContent}}}
\`\`\``;

async function fetchPropertyImagesFlow({ url }: FetchPropertyImagesInput): Promise<FetchPropertyImagesOutput> {
    try {
        const htmlContent = await fetchPageSourceCode(url);
        const output = await generateText<FetchPropertyImagesOutput>({
            model: 'gemini-2.5-flash-lite',
            promptText: imageExtractionPrompt,
            inputData: { sourceUrl: url, htmlContent },
            outputSchema: FetchPropertyImagesOutputSchema,
        });
        
        if (!output || !output.images) {
            return { error: 'AI was unable to extract any valid images from the page.' };
        }

        return { images: output.images };
    } catch (e: any) {
        await logProblem(e, 'fetchPropertyImagesFlow');
        return { error: e.message || 'An unknown error occurred during image extraction.' };
    }
}

export async function fetchImagesFromUrl(input: FetchPropertyImagesInput): Promise<FetchPropertyImagesOutput> {
    return fetchPropertyImagesFlow(input);
}
