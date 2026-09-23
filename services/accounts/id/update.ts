import { updateUser, updateAccountAccessInfo, refreshAccountDisplayInfo } from './lookup';
export { updateAccountAccessInfo, refreshAccountDisplayInfo };

import { UpdateUserSchema, type UpdateUserFormValues } from '@/types';
import { logger } from "@neup/logica/logger";

export async function updateUserAction(data: UpdateUserFormValues): Promise<{ success: boolean; error?: string }> {
  try {
    const validatedData = UpdateUserSchema.parse(data);
    await updateUser(validatedData.id, validatedData);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    await logger().type(`updateUserAction (ID: ${data.id})`).data({ error: String(error), details: {} }).log();
    return { success: false, error: 'Failed to update user.' };
  }
}
