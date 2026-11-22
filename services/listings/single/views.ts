"use server";

import type { CreateUserActivityInput, ListingActivityEvent } from "@/types";
import { getListingBySlug } from "../view";
import { parseListingSlugId } from '@/services/listings/slug';
import { prisma } from '@neup/core/database/prisma';
import { logActivity } from "@/services/activities/log";
import { updateAccountAccessInfo } from "@/services/accounts/id/lookup";
import { updateAccountPreferences } from "@/services/accounts/single/preferences";

export async function logListingViews(userId: string, events: ListingActivityEvent[], slug?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || events.length === 0) return { success: true };
    const parsedSlug = slug ? parseListingSlugId(slug) : null;
    if (slug && !parsedSlug) return { success: false, error: 'A canonical slug--id listing identifier is required.' };
    const property = parsedSlug
      ? await prisma.listing.findFirst({ where: { id: parsedSlug.id, slug: parsedSlug.slug }, select: { id: true } })
      : null;
    if (slug && !property) return { success: false, error: 'Property not found.' };
    await updateAccountAccessInfo(userId);
    for (const event of events) {
      const activityData: CreateUserActivityInput = { userId, activity: event.type, page: event.page, propertyId: property?.id, activityOn: new Date().toISOString(), duration: event.duration };
      await logActivity(activityData);
    }
    if (slug) {
      const listing = await getListingBySlug(slug);
      if (listing) await updateAccountPreferences(userId, listing, events);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to log property views.' };
  }
}
