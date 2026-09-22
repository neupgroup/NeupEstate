"use server";

import type { CreateUserActivityInput, PropertyActivityEvent } from "@/types";
import { getPropertyById } from "../view";
import { logActivity } from "@/services/activities/log";
import { updateAccountAccessInfo } from "@/services/accounts/id/lookup";
import { updateAccountPreferences } from "@/services/accounts/single/preferences";
import { logger } from "@neup/logica/logger";

export async function logPropertyViews(userId: string, events: PropertyActivityEvent[], propertyId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || events.length === 0) return { success: true };
    await updateAccountAccessInfo(userId);
    for (const event of events) {
      const activityData: CreateUserActivityInput = { userId, activity: event.type, page: event.page, propertyId, activityOn: new Date().toISOString(), duration: event.duration };
      await logActivity(activityData);
    }
    if (propertyId) {
      const property = await getPropertyById(propertyId);
      if (property) await updateAccountPreferences(userId, property, events);
      else await logger().type(`logPropertyViews (Prop: ${propertyId})`).data({ error: String(new Error('Property not found during preference update.')), details: {} }).log();
    }
    return { success: true };
  } catch (error: any) {
    await logger().type(`logPropertyViews (User: ${userId}, Prop: ${propertyId})`).data({ error: String(error), details: {} }).log();
    return { success: false, error: error.message || 'Failed to log property views.' };
  }
}
