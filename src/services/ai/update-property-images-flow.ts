
'use server';

/**
 * @fileOverview An AI agent that specifically updates the images for a property listing.
 *
 * - runPropertyImageUpdate - A function that handles the image update process.
 * - PropertyImageUpdateResult - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getPropertyById, updatePropertyImages } from '@/services/property-service';
import { PropertyImageUpdateResultSchema, type PropertyImageUpdateResult } from '@/types';
import { fetchPageContent } from '@/services/activities/fetch-page-content';

const ImageUpdateInputSchema = z.object({
    propertyId: z.string(),
});
type ImageUpdateInput = z.infer<typeof ImageUpdateInputSchema>;

export type { PropertyImageUpdateResult };

const AIImageExtractionOutputSchema = z.object({
    images: z.array(z.string()).describe("A list of all relevant property image URLs found on the page. The URLs MUST be full, absolute URLs. Filter out logos, icons, or agent photos."),
});

const imageUpdatePrompt = ai.definePrompt({
    name: 'propertyImageUpdatePrompt',
    input: { schema: z.object({ sourceUrl: z.string().url() })},
    output: { schema: AIImageExtractionOutputSchema },
    tools: [fetchPageContent],
    prompt: `You are an AI data scraper specializing in extracting property images. Your primary mission is to return a clean, accurate list of full, absolute image URLs. High accuracy is critical.

**IMPORTANT**: Many websites use JavaScript to lazy-load images or store image data in script tags. You MUST inspect the HTML for these advanced patterns.

**Instructions:**
1.  Use the "fetchPageContent" tool to get the full HTML content for the source URL: {{{sourceUrl}}}
2.  Analyze the entire HTML to find URLs for property images.

**Extraction Strategy (in order of priority):**
1.  **Find Lazy-loaded Images**: Search \`<img>\` tags for attributes like \`data-src\`, \`data-lazy\`, \`data-lazy-src\`, \`data-srcset\`. These often contain the real image URL.
2.  **Scrape JSON from \`<script>\` tags**: Look for \`<script type="application/ld+json">\` or other \`<script>\` tags containing JSON data. This data often includes a list of image URLs for a photo gallery.
3.  **Analyze HTML Structure for Standard \`src\` attributes**: Before extracting a URL from a standard \`src\` attribute, analyze up to 10 levels of parent container classes to determine if the image is part of a property listing. Give high priority to images inside containers with class names like \`property-card\`, \`listing\`, \`property\`, \`results\`, \`listing-item\`, \`gallery\`, \`carousel\`, \`slider\`, \`photo-container\`, etc.

**URL Correction Rules (CRITICAL):**
1.  **Absolute URLs ONLY**: Every URL in your final output MUST be a full, absolute URL (e.g., "https://example.com/images/prop.jpg").
2.  **Handle Relative URLs**: If you find a relative URL (e.g., "/images/prop.jpg"), you MUST convert it to an absolute URL using the source page's origin. The source URL is {{{sourceUrl}}}. For example, if the source is \`https://example.com/listings/page1\` and you find \`/img/house.png\`, the correct absolute URL is \`https://example.com/img/house.png\`.
3.  **Handle Protocol-Relative URLs**: If you find a URL starting with \`//\` (e.g., \`//cdn.site.com/image.jpg\`), prepend \`https:\` to it.

**What to Exclude:**
- Logos, social icons, map thumbnails, agent photos, user avatars, or decorative patterns.
- Any image inside \`<header>\`, \`<footer>\`, \`<nav>\`, or unrelated \`<aside>\`.
- Images with filenames or paths including terms like: \`logo\`, \`icon\`, \`agent\`, \`feature\`, \`service\`, \`testimonial\`, \`contact\`, \`user\`.
- Image URLs that include keywords like: house, home, property, listing, realestate, land, flat, residence, apartment, etc.

Return a clean list of only property image URLs, with optional context like title or class name.

Return a list of valid, absolute property image URLs in the \`images\` field. If no relevant images are found, return an empty array.
`,
});

const propertyImageUpdateFlow = ai.defineFlow(
    {
        name: 'propertyImageUpdateFlow',
        inputSchema: ImageUpdateInputSchema,
        outputSchema: PropertyImageUpdateResultSchema,
    },
    async ({ propertyId }) => {
        const property = await getPropertyById(propertyId);

        if (!property) {
            return { updated: false, reason: "Property not found in database." };
        }
        if (property.isApproved) {
            return { updated: false, reason: "Skipped: Property is already approved." };
        }
        if (!property.sourceUrl) {
            return { updated: false, reason: "Skipped: Property is not an imported listing (no source URL)." };
        }

        const { output } = await imageUpdatePrompt({ sourceUrl: property.sourceUrl });

        if (!output || !output.images) {
            return { updated: false, reason: "AI failed to extract images from the source." };
        }

        // Check if the images are different
        const oldImages = new Set(property.images);
        const newImages = new Set(output.images);

        if (oldImages.size === newImages.size && [...oldImages].every(img => newImages.has(img))) {
            return { updated: false, reason: "Skipped: Images are already up-to-date.", imageCount: output.images.length };
        }

        // Update only the images field
        await updatePropertyImages(propertyId, output.images);
        return { updated: true, reason: `Successfully updated images. Found ${output.images.length} new images.`, imageCount: output.images.length };
    }
);

export async function runPropertyImageUpdate(propertyId: string): Promise<PropertyImageUpdateResult> {
    return propertyImageUpdateFlow({ propertyId });
}
