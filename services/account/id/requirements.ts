"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { CreateRequirementFormValues } from "@/types";
import { CreateRequirementSchema } from "@/types";
import { createRequirement, updateRequirement } from "@/services/requirements-service";
import { requireIdentity } from "@/services/properties/action-helpers";
import { requirePermission, PERMISSIONS } from "@/services/permissions";
import { logProblem } from "@/services/problem-service";

export async function upsertRequirementAction(
  data: CreateRequirementFormValues,
  requirementId?: string,
): Promise<{ success: boolean; error?: string | null }> {
  try {
    await requirePermission(PERMISSIONS.public.requirementCreate);
    const actorId = await requireIdentity();
    const validatedData = CreateRequirementSchema.parse({ ...data, userId: actorId });

    if (requirementId) {
      await updateRequirement(requirementId, validatedData);
    } else {
      await createRequirement(validatedData);
    }

    revalidatePath('/profile');
    return { success: true, error: null };
  } catch (error: any) {
    if (error instanceof z.ZodError) return { success: false, error: error.message };
    await logProblem(error, 'upsertRequirementAction');
    return { success: false, error: 'Failed to save requirements.' };
  }
}
