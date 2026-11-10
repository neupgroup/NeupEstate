"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CreateRequirementFormValues } from "@/types";
import { CreateRequirementSchema } from "@/types";
import { prisma } from '@neup/core/database/prisma';
import { createRequirement } from "@/services/requirements/create";
import { updateRequirement } from "@/services/requirements/update";
import { requireIdentity } from "@/services/listings/action-helpers";

type RequirementFormSubmission = Omit<CreateRequirementFormValues, 'purpose'> & {
  purpose?: string;
  minPrice?: number;
  maxPrice?: number;
};

/** Extract useful, non-payload details from action and Prisma errors. */
function getRequirementErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return { name: 'UnknownError', message: String(error) };
  }

  const prismaError = error as Error & { code?: unknown; meta?: unknown };
  const cause = error.cause instanceof Error
    ? { name: error.cause.name, message: error.cause.message }
    : error.cause == null ? undefined : String(error.cause);

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: prismaError.code,
    meta: prismaError.meta,
    cause,
  };
}

export async function upsertRequirementAction(
  data: RequirementFormSubmission,
  requirementId?: string,
): Promise<{ success: boolean; error?: string | null }> {
  let stage = 'authenticate';
  try {
    const actorId = await requireIdentity();
    stage = 'validate';
    const validatedData = CreateRequirementSchema.parse({
      ...data,
      userId: actorId,
      purpose: data.purpose === 'Buy' ? 'Sale' : data.purpose,
      minBudget: data.minBudget ?? data.minPrice,
      maxBudget: data.maxBudget ?? data.maxPrice,
    });

    if (requirementId) {
      stage = 'verify ownership';
      const ownedRequirement = await prisma.requirement.findFirst({
        where: { id: requirementId, userId: actorId },
        select: { id: true },
      });
      if (!ownedRequirement) return { success: false, error: 'Requirement not found.' };
      stage = 'update database';
      await updateRequirement(requirementId, validatedData);
    } else {
      stage = 'create database record';
      await createRequirement(validatedData);
    }

    revalidatePath('/profile');
    return { success: true, error: null };
  } catch (error: any) {
    const isValidationError = error instanceof z.ZodError;
    const details = getRequirementErrorDetails(error);
    if (isValidationError) return { success: false, error: error.message };
    return { success: false, error: 'Failed to save requirements.' };
  }
}
