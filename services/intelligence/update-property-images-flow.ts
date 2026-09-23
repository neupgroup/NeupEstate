
'use server';

/**
 * @fileOverview An AI agent that specifically updates the images for a property listing.
 *
 * - runPropertyImageUpdate - A function that handles the image update process.
 * - PropertyImageUpdateResult - The return type for the function.
 */

import type { PropertyImageUpdateResult } from '@/types';

async function propertyImageUpdateFlow(propertyId: string): Promise<PropertyImageUpdateResult> {
    void propertyId;
    return { updated: false, reason: "Source-based property image updates are disabled." };
}

export async function runPropertyImageUpdate(propertyId: string): Promise<PropertyImageUpdateResult> {
    return propertyImageUpdateFlow(propertyId);
}
