'use server';

import { getIdentity } from '@/services/neupid/get-identity';
import { logProblem } from '@/services/problem-service';
import { requirePermission, PERMISSIONS } from '@/services/permissions';
import { revalidatePath } from 'next/cache';
import { isPropertySaved, toggleSavedProperty } from '../view';



/**
 * isSaved handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function isSaved(accountId: string, propertyId: string): Promise<boolean> {
  try {
    await requirePermission(PERMISSIONS.public.propertySave);
    const identity = await getIdentity();
    const verifiedUserId = identity.authenticated ? identity.account.accountId : accountId;
    if (!verifiedUserId) return false;
    return await isPropertySaved(verifiedUserId, propertyId);
  } catch (e) {
    await logProblem(e, `isSaved (Account: ${accountId}, Prop: ${propertyId})`);
    return false;
  }
}



/**
 * toggleSave handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function toggleSave(accountId: string, propertyId: string): Promise<{ saved: boolean }> {
  await requirePermission(PERMISSIONS.public.propertySave);
  const identity = await getIdentity();
  const verifiedUserId = identity.authenticated ? identity.account.accountId : accountId;
  if (!verifiedUserId) throw new Error('User ID is required to save a property.');
  const result = await toggleSavedProperty(verifiedUserId, propertyId);
  revalidatePath('/saved');
  revalidatePath('/manage/saved');
  return result;
}
