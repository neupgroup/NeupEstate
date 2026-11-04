
'use server';

/**
 * @fileOverview An AI agent that specifically updates the images for a property listing.
 *
 * - runPropertyImageUpdate - A function that handles the image update process.
 * - ListingImageUpdateResult - The return type for the function.
 */

import type { ListingImageUpdateResult } from '@/types';

async function propertyImageUpdateFlow(propertyId: string): Promise<ListingImageUpdateResult> {
    void propertyId;
    return { updated: false, reason: "Source-based property image updates are disabled." };
}

export async function runListingImageUpdate(propertyId: string): Promise<ListingImageUpdateResult> {
    return propertyImageUpdateFlow(propertyId);
}
