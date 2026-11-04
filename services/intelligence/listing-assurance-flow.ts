'use server';

/**
 * @fileOverview An AI agent that ensures property data is up-to-date before approving it.
 *
 * - runPropertyAssurance - A function that handles the property assurance process.
 */

import { runListingAmendment } from '@/services/intelligence/listing-amendment-flow';
import { runListingApproval } from '@/services/intelligence/listing-approval-flow';
import { getListingById } from '@/services/listings';
import type { ListingAssuranceResult } from '@/types';

export async function runListingAssurance(propertyId: string): Promise<ListingAssuranceResult> {
  const steps: string[] = [];

  const property = await getListingById(propertyId);
  if (!property) {
    return { assured: false, reason: 'Property not found.', steps };
  }
  if (property.isApproved) {
    return { assured: false, reason: 'Property is already approved. Assurance check is for pending properties.', steps };
  }

  // Step 1: Run amendment to ensure data is fresh.
  steps.push('Starting amendment check to ensure data is up-to-date...');
  const amendmentResult = await runListingAmendment(propertyId);
  steps.push(`Amendment check finished: ${amendmentResult.reason}`);
  
  if (amendmentResult.amended) {
    steps.push('Property data was updated based on live source.');
  }

  // Step 2: Run approval on the (potentially updated) data.
  steps.push('Starting approval check...');
  const approvalResult = await runListingApproval(propertyId);
  steps.push(`Approval check finished: ${approvalResult.reason}`);

  if (approvalResult.approved) {
    return {
      assured: true,
      reason: 'Property was successfully verified and approved.',
      steps,
    };
  } else {
    return {
      assured: false,
      reason: `Assurance failed. Property could not be approved. Final status: ${approvalResult.reason}`,
      steps,
    };
  }
}
