'use server';

import { updateUser, updateAccountAccessInfo, refreshAccountDisplayInfo } from './lookup';
export { updateAccountAccessInfo, refreshAccountDisplayInfo };

import { UpdateUserSchema, type UpdateUserFormValues } from '@/types';
import { PERMISSIONS } from '@/services/permission-names';;
import { requirePermission } from '@/services/permissions';;

export async function updateUserAction(data: UpdateUserFormValues): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission(PERMISSIONS.manage.accountUpdate);
    const validatedData = UpdateUserSchema.parse(data);
    await updateUser(validatedData.id, validatedData);
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Failed to update user.' };
  }
}
