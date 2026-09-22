'use server';

import { getIdentity } from '@/services/neupid/get-identity';
import { requirePermission, PERMISSIONS } from '@/services/permissions';
import { revalidatePath } from 'next/cache';
import { toggleSavedProperty } from '../../view';

export async function unsave(accountId: string, propertyId: string): Promise<{ saved: boolean }> {
  await requirePermission(PERMISSIONS.public.propertySave);
  const identity = await getIdentity();
  const verifiedUserId = identity.authenticated ? identity.account.accountId : accountId;
  if (!verifiedUserId) throw new Error('User ID is required to unsave a property.');
  const result = await toggleSavedProperty(verifiedUserId, propertyId);
  revalidatePath('/saved');
  revalidatePath('/manage/saved');
  return result;
}
