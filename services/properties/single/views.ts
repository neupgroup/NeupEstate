"use server";

import type { CreateUserActivityInput, PropertyActivityEvent } from "@/types";
import { getPropertyById } from "../view";
import { logActivity, updateAccountAccessInfo } from "@/services/activity-service";
import { updateUserPreferences } from "@/services/user-preference-service";
import { logProblem } from "@/services/problem-service";

export async function logPropertyViews(userId: string, events: PropertyActivityEvent[], propertyId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!userId || events.length === 0) return { success: true };
    await updateAccountAccessInfo(userId, 'unknown');
    for (const event of events) {
      const activityData: CreateUserActivityInput = { userId, activity: event.type, page: event.page, propertyId, activityOn: new Date().toISOString(), duration: event.duration };
      await logActivity(activityData);
    }
    if (propertyId) {
      const property = await getPropertyById(propertyId);
      if (property) await updateUserPreferences(userId, property, events);
      else await logProblem(new Error('Property not found during preference update.'), `logPropertyViews (Prop: ${propertyId})`);
    }
    return { success: true };
  } catch (error: any) {
    await logProblem(error, `logPropertyViews (User: ${userId}, Prop: ${propertyId})`);
    return { success: false, error: error.message || 'Failed to log property views.' };
  }
}
