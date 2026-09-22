'use server';

import { getIdentity } from '@/services/neupid/get-identity';
import { logProblem } from '@/services/problem-service';
import { requirePermission, PERMISSIONS } from '@/services/permissions';
import { revalidatePath } from 'next/cache';
import { isPropertySaved, toggleSavedProperty } from '../../view';

export async function save(accountId: string, propertyId: string): Promise<{ saved: boolean }> {
  await requirePermission(PERMISSIONS.public.propertySave);
  const identity = await getIdentity();
  const verifiedUserId = identity.authenticated ? identity.account.accountId : accountId;
  if (!verifiedUserId) throw new Error('User ID is required to save a property.');
  const result = await toggleSavedProperty(verifiedUserId, propertyId);
  revalidatePath('/saved');
  revalidatePath('/manage/saved');
  return result;
}

export async function isSaved(accountId: string, propertyId: string): Promise<boolean> {
  try {
    await requirePermission(PERMISSIONS.public.propertySave);
    const identity = await getIdentity();
    const verifiedUserId = identity.authenticated ? identity.account.accountId : accountId;
    if (!verifiedUserId) return false;
    return await isPropertySaved(verifiedUserId, propertyId);
  } catch (error) {
    await logProblem(error, `isSaved (Account: ${accountId}, Prop: ${propertyId})`);
    return false;
  }
}
