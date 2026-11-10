"use server";

import { logger } from "@neup/logica/logger";
import { revalidatePath } from "next/cache";
import { deleteAccountAndData } from '@/services/accounts/id/delete';
import { PERMISSIONS } from '@/services/permission-names';;
import { requirePermission } from '@/services/permissions';;

export async function deleteAccountAction(accountId: string) {
  try {
    await requirePermission(PERMISSIONS.manage.accountUpdateDelete);
    await deleteAccountAndData(accountId);
    try {
      revalidatePath('/manage/accounts');
    } catch (_) {}
    return { success: true };
  } catch (e: any) {
    await logger().type(`deleteAccountAction (ID: ${accountId})`).data({ error: String(e), details: {} }).log();
    return { success: false, error: 'Failed to delete account.' };
  }
}
