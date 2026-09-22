import { updateUser, updateAccountAccessInfo, refreshAccountDisplayInfo } from './lookup';
export { updateAccountAccessInfo, refreshAccountDisplayInfo };

import { revalidatePath } from 'next/cache';
import { UpdateUserSchema, type UpdateUserFormValues } from '@/types';
import { logProblem } from '@/services/problem-service';

export async function updateUserAction(data: UpdateUserFormValues): Promise<{ success: boolean; error?: string }> {
  try {
    const validatedData = UpdateUserSchema.parse(data);
    await updateUser(validatedData.id, validatedData);
    revalidatePath(`/manage/users/${validatedData.id}`);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    await logProblem(error, `updateUserAction (ID: ${data.id})`);
    return { success: false, error: 'Failed to update user.' };
  }
}
