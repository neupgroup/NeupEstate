"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  CreateMortgageRequestFormValues,
  CreatePropertyRequestFormValues,
  CreateSalesRequestFormValues,
} from "@/types";
import {
  CreateMortgageRequestSchema,
  CreatePropertyRequestSchema,
  CreateSalesRequestSchema,
} from "@/types";
import { createPropertyRequest } from "@/services/inquiry/property-requests";
import { createSalesRequest } from "@/services/inquiry/sales-requests";
import { createMortgageRequest } from "@/services/mortgage/create";
import { requireIdentity } from "@/services/properties/action-helpers";
import { requirePermission, PERMISSIONS } from "@/services/permissions";
import { logger } from "@neup/logica/logger";

export async function createPropertyRequestAction(data: CreatePropertyRequestFormValues): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission(PERMISSIONS.public.requirementCreate);
    const actorId = await requireIdentity();
    const validatedData = CreatePropertyRequestSchema.parse({ ...data, submittedBy: actorId });
    await createPropertyRequest(validatedData);
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
    await requirePermission(PERMISSIONS.public.mortgageRequest);
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
