'use server';

import { requireAuth } from '@/services/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { BrandAccount } from '@/services/neupid/get-brand-accounts';

/**
 * Creates an agency from a brand account.
 * The agency ID will be the same as the brand account ID.
 * All details are synced from the brand account and cannot be modified.
 */
export async function createAgencyFromBrandAction(brand: BrandAccount) {
  // Require authentication
  await requireAuth();

  try {
    // Check if agency already exists
    const existing = await prisma.agency.findUnique({
      where: { id: brand.id },
    });

    if (existing) {
      return {
        success: false,
        error: 'An agency with this brand account already exists.',
      };
    }

    // Create agency with brand account details
    // Note: We use the brand.id as the agency ID to maintain the link
    await prisma.agency.create({
      data: {
        id: brand.id, // Use brand account ID as agency ID
        name: brand.displayName,
        logoUrl: brand.displayImage,
        registeredName: brand.displayName,
        description: `Agency for ${brand.displayName} (${brand.accountType})`,
        // Other fields can be null/empty as they come from NeupID
        contactEmail: null,
        contactPhone: null,
        mainLocation: null,
        branches: [],
      },
    });

    revalidatePath('/manage/agencies');
    revalidatePath('/manage/agencies/select-brand');

    return {
      success: true,
      agencyId: brand.id,
    };
  } catch (error) {
    console.error('Failed to create agency from brand:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create agency',
    };
  }
}
