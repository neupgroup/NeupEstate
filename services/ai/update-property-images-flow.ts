
'use server';

/**
 * @fileOverview An AI agent that specifically updates the images for a property listing.
 *
 * - runPropertyImageUpdate - A function that handles the image update process.
 * - PropertyImageUpdateResult - The return type for the function.
 */

import { ai } from '@/logica/core/ai/genkit';
import { z } from 'zod';
import { PropertyImageUpdateResultSchema, type PropertyImageUpdateResult } from '@/types';

const ImageUpdateInputSchema = z.object({
    propertyId: z.string(),
});
const propertyImageUpdateFlow = ai.defineFlow(
    {
        name: 'propertyImageUpdateFlow',
        inputSchema: ImageUpdateInputSchema,
        outputSchema: PropertyImageUpdateResultSchema,
    },
    async ({ propertyId }) => {
        void propertyId;
        return { updated: false, reason: "Source-based property image updates are disabled." };
    }
);

export async function runPropertyImageUpdate(propertyId: string): Promise<PropertyImageUpdateResult> {
    return propertyImageUpdateFlow({ propertyId });
}
