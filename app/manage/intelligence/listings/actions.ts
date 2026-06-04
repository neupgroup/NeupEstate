'use server';

import { revalidatePath } from 'next/cache';
import { extractCompetitorListing } from '@/services/ai/extract-competitor-listing-flow';
import {
  getCompetitorPageById,
  getCompetitorListingByPageId,
  upsertCompetitorListing,
} from '@/services/competitor-service';

export async function extractCompetitorListingAction(competitorPageId: string) {
  const page = await getCompetitorPageById(competitorPageId);
  if (!page) {
    return { success: false, error: 'Source page not found.' };
  }

  if (page.lastLoggedStatus) {
    return { success: false, error: `This page is marked with HTTP ${page.lastLoggedStatus} and will not be extracted.` };
  }

  const result = await extractCompetitorListing({
    url: page.source,
  });

  if (!result.isPropertyPage) {
    return { success: false, error: 'This page does not appear to be a property page.' };
  }

  const listingId = await upsertCompetitorListing({
    competitorPageId: page.id,
    title: result.title ?? page.title,
    description: result.description,
    purpose: result.purpose ?? 'sales',
    agentName: result.agentName,
    price: result.price,
    priceBasis: result.priceBasis,
    isSold: result.isSold ?? false,
    details: result.details,
  });

  revalidatePath('/manage/intelligence/listings');

  return {
    success: true,
    listingId,
    existingListingId: await getCompetitorListingByPageId(page.id).then((listing) => listing?.id ?? null),
  };
}
