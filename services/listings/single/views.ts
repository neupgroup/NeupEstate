"use server";

import type { CreateUserActivityInput, ListingActivityEvent } from "@/types";
import { getListingById } from "../view";
import { logActivity } from "@/services/activities/log";
import { updateAccountAccessInfo } from "@/services/accounts/id/lookup";
import { updateAccountPreferences } from "@/services/accounts/single/preferences";

export async function logListingViews(userId: string, events: ListingActivityEvent[], propertyId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || events.length === 0) return { success: true };
    await updateAccountAccessInfo(userId);
    for (const event of events) {
      const activityData: CreateUserActivityInput = { userId, activity: event.type, page: event.page, propertyId, activityOn: new Date().toISOString(), duration: event.duration };
      await logActivity(activityData);
    }
    if (propertyId) {
      const property = await getListingById(propertyId);
      if (property) await updateAccountPreferences(userId, property, events);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to log property views.' };
  }
}
