"use server";
import { prisma } from '@neup/core/database/prisma';
import { requireIdentity, normalizeListingChangeData } from '@/services/listings/action-helpers';
import { PERMISSIONS } from '@/services/permission-names';;
import { requirePermission } from '@/services/permissions';;
import { deleteListing } from './delete';
import { getListingById, createListingLog } from '@/services/listings/view';
import { revalidatePath } from 'next/cache';
import { normalizeOwnerReferenceEntries } from '@/services/listings/action-helpers';



/**
 * approveProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function approveListing(propertyId: string): Promise<void> {
  try {
    await prisma.listing.update({ where: { id: propertyId }, data: { status: 'ACTIVE', isApproved: true } });
  } catch (error) {
    throw new Error('Failed to approve property.');
  }
}



/**
 * rejectProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function rejectListing(propertyId: string): Promise<void> {
  try {
    await prisma.listing.update({ where: { id: propertyId }, data: { status: 'PENDING', isApproved: false } });
  } catch (error) {
    throw new Error('Failed to reject property.');
  }
}



/**
 * approvePropertyAction handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function approveListingAction(propertyId: string) {
  try {
    const actorId = await requireIdentity(); await approveListing(propertyId);
    const property = await getListingById(propertyId, { includeInactive: true });
    if (property) await createListingLog({ propertyId, requestedBy: actorId, approvedBy: actorId, approvedOn: new Date(), data: Object.entries(property as Record<string, any>).map(([field, value]) => ({ field, value: field === 'owner' ? normalizeOwnerReferenceEntries(value) : value })) });
    revalidatePath('/manage/listings'); revalidatePath(`/manage/listings/${propertyId}/edit`); return { success: true };
  } catch (error) { return { success: false, error: 'Failed to approve property.' }; }
}



/**
 * deletePropertyAction handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function deleteListingAction(propertyId: string) {
  try { await requirePermission(PERMISSIONS.estate.listing.drop); const actorAccountId = await requireIdentity(); await deleteListing({ propertyId }, { actorAccountId }); revalidatePath('/manage/listings'); return { success: true }; }
  catch (error) { return { success: false, error: 'Failed to delete property.' }; }
}



/**
 * requestPropertyDeletionAction handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function requestListingDeletionAction(propertyId: string) {
  try {
    await requirePermission(PERMISSIONS.estate.listing.drop); const accountId = await requireIdentity();
    const existingDraft = await prisma.listingChange.findFirst({ where: { propertyId, accountId, status: 'deleting', isApproved: null }, orderBy: { modifiedOn: 'desc' }, select: { id: true, data: true } });
    const data = existingDraft?.data && typeof existingDraft.data === 'object' && !Array.isArray(existingDraft.data) ? normalizeListingChangeData(existingDraft.data as Record<string, any>) : {};
    await prisma.listingChange.upsert({ where: { id: existingDraft?.id ?? '__new_property_change__' }, update: { status: 'deleting', data, modifiedOn: new Date() }, create: { propertyId, accountId, status: 'deleting', isApproved: null, data } });
    revalidatePath('/manage/listings'); revalidatePath(`/manage/listings/${propertyId}`); return { success: true };
  } catch (error) { return { success: false, error: 'Failed to request property deletion.' }; }
}



/**
 * cancelPropertyChangeDraftAction handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function cancelListingChangeDraftAction(changeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const accountId = await requireIdentity();
    const draft = await prisma.listingChange.findFirst({ where: { id: changeId, accountId, isApproved: null }, select: { id: true, propertyId: true, status: true } });
    if (!draft) return { success: false, error: 'Pending request not found.' };
    await requirePermission(draft.status === 'deleting' ? PERMISSIONS.estate.listing.drop : PERMISSIONS.estate.listing.update);
    if (draft.status === 'deleting' && draft.propertyId) await prisma.listing.update({ where: { id: draft.propertyId }, data: { status: 'ACTIVE' } });
    await prisma.listingChange.delete({ where: { id: draft.id } });
    return { success: true };
  } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel property change draft.' }; }
}
