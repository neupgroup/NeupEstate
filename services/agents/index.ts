"use server";

import { getAgentsByLocation as getAgentsByLocationService, createAgent as createAgentService, updateAgent as updateAgentService, deleteAgent as deleteAgentService } from '@/services/agents/agent/service';
import { logger } from "@neup/logica/logger";
import type { Agent, CreateAgentFormValues, UpdateAgentFormValues } from "@/types";
import { CreateAgentSchema, UpdateAgentSchema } from "@/types";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from '@neup/core/database/prisma';
import { requireIdentity } from '@/services/listings/action-helpers';

export async function searchAgentsByLocationAction(
  location: string
): Promise<{ success: boolean; data: Agent[] | null; error: string | null }> {
  try {
    if (!location) {
      // Not an error, just return empty
      return { success: true, data: [], error: null };
    }
    const agents = await getAgentsByLocationService(location);
    return { success: true, data: agents, error: null };
  } catch (e: any) {
    await logger().type('searchAgentsByLocationAction').data({ error: String(e), details: {} }).log();
    return { success: false, data: null, error: "An error occurred while searching for agents." };
  }
}

// Agent Actions
export async function createAgentAction(
  data: CreateAgentFormValues
): Promise<{ success: boolean; error?: string | null; agentId?: string | null }> {
  try {
    await requireIdentity();
    const validatedData = CreateAgentSchema.parse(data);
    const agentId = await createAgentService(validatedData);
    if (validatedData.registered && validatedData.userId) {
      const agentAccount = await prisma.account.findUnique({
        where: { id: validatedData.userId },
        select: { accountType: true },
      });
      await prisma.account.updateMany({
        where: { id: validatedData.userId },
        data: { accountType: "individual.agent" },
      });
    }
    revalidatePath('/manage/team');
    return { success: true, agentId, error: null };
  } catch (e: any) {
    await logger().type('createAgentAction').data({ error: String(e), details: {} }).log();
    if (e instanceof z.ZodError) {
        return { success: false, error: e.message, agentId: null };
    }
    return { success: false, error: "An unexpected server error occurred.", agentId: null };
  }
}

export async function updateAgentAction(
  id: string,
  data: UpdateAgentFormValues
): Promise<{ success: boolean; error?: string | null; }> {
  try {
    await requireIdentity();
    const validatedData = UpdateAgentSchema.parse(data);
    await updateAgentService(id, validatedData);
    revalidatePath('/manage/team');
    revalidatePath(`/manage/agents/${id}/edit`);
    return { success: true, error: null };
  } catch (e: any) {
    await logger().type(`updateAgentAction (ID: ${id})`).data({ error: String(e), details: {} }).log();
    if (e instanceof z.ZodError) {
        return { success: false, error: e.message };
    }
    return { success: false, error: "An unexpected server error occurred." };
  }
}

export async function deleteAgentAction(agentId: string) {
    try {
        await deleteAgentService(agentId);
        revalidatePath('/manage/team');
        return { success: true };
    } catch (error: any) {
        await logger().type(`deleteAgentAction (ID: ${agentId})`).data({ error: String(error), details: {} }).log();
        return { success: false, error: "Failed to delete agent." };
    }
}
