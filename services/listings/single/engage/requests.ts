"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  CreateMortgageRequestFormValues,
  CreateListingRequestFormValues,
  CreateSalesRequestFormValues,
} from "@/types";
import {
  CreateMortgageRequestSchema,
  CreateListingRequestSchema,
  CreateSalesRequestSchema,
} from "@/types";
import { createListingRequest } from "@/services/inquiry/listing-requests";
import { createSalesRequest } from "@/services/inquiry/sales-requests";
import { createMortgageRequest } from "@/services/mortgage/create";
import { requireIdentity } from "@/services/listings/action-helpers";
import { PERMISSIONS } from '@/services/permission-names';;
import { requirePermission } from '@/services/permissions';;
import { logger } from "@neup/logica/logger";

export async function createListingRequestAction(data: CreateListingRequestFormValues): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission(PERMISSIONS.estate.requirement.create);
    const actorId = await requireIdentity();
    const validatedData = CreateListingRequestSchema.parse({ ...data, submittedBy: actorId });
    await createListingRequest(validatedData);
    revalidatePath('/manage/requests');
    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) return { success: false, error: error.message };
    await logger().type('createPropertyRequestAction').data({ error: String(error), details: {} }).log();
    return { success: false, error: error.message || 'Failed to submit property request.' };
  }
}

export async function createSalesRequestAction(data: CreateSalesRequestFormValues): Promise<{ success: boolean; error?: string }> {
  try {
    const actorId = await requireIdentity();
    const validatedData = CreateSalesRequestSchema.parse({ ...data, submittedBy: actorId });
    await createSalesRequest(validatedData);
    revalidatePath('/manage/sales-requests');
    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) return { success: false, error: error.message };
    await logger().type('createSalesRequestAction').data({ error: String(error), details: {} }).log();
    return { success: false, error: error.message || 'Failed to submit sales request.' };
  }
}

export async function createMortgageRequestAction(data: CreateMortgageRequestFormValues): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission(PERMISSIONS.estate.mortgageRequests.create);
    const actorId = await requireIdentity();
    const validatedData = CreateMortgageRequestSchema.parse({ ...data, submittedBy: actorId });
    await createMortgageRequest(validatedData);
    revalidatePath('/manage/mortgage-requests');
    return { success: true };
  } catch (error: any) {
    if (error instanceof z.ZodError) return { success: false, error: error.message };
    await logger().type('createMortgageRequestAction').data({ error: String(error), details: {} }).log();
    return { success: false, error: error.message || 'Failed to submit mortgage request.' };
  }
}
