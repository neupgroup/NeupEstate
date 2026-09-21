"use server";
import { prisma } from '@neup/core/database/prisma';
import { requireIdentity, normalizePropertyChangeData } from '@/services/property/action-helpers';
import { requirePermission, PERMISSIONS } from '@/services/permissions';
import { logProblem } from '@/services/problem-service';
import { deleteProperty } from './delete';
import { getPropertyById, createPropertyLog } from '@/services/properties/view';
import { revalidatePath } from 'next/cache';
import { normalizeOwnerReferenceEntries } from '@/services/property/action-helpers';

export async function approveProperty(propertyId: string): Promise<void> {
  try {
    await prisma.property.update({ where: { id: propertyId }, data: { status: 'ACTIVE', isApproved: true } });
  } catch (error) {
    await logProblem(error, `approveProperty ${propertyId}`);
    throw new Error('Failed to approve property.');
  }
}

export async function rejectProperty(propertyId: string): Promise<void> {
  try {
    await prisma.property.update({ where: { id: propertyId }, data: { status: 'PENDING', isApproved: false } });
  } catch (error) {
    await logProblem(error, `rejectProperty ${propertyId}`);
    throw new Error('Failed to reject property.');
  }
}

export async function approvePropertyAction(propertyId: string) {
  try {
    const actorId = await requireIdentity(); await approveProperty(propertyId);
    const property = await getPropertyById(propertyId, { includeInactive: true });
    if (property) await createPropertyLog({ propertyId, requestedBy: actorId, approvedBy: actorId, approvedOn: new Date(), data: Object.entries(property as Record<string, any>).map(([field, value]) => ({ field, value: field === 'owner' ? normalizeOwnerReferenceEntries(value) : value })) });
    revalidatePath('/manage/properties'); revalidatePath(`/manage/properties/${propertyId}/edit`); return { success: true };
  } catch (error) { await logProblem(error, `approvePropertyAction (ID: ${propertyId})`); return { success: false, error: 'Failed to approve property.' }; }
}

export async function deletePropertyAction(propertyId: string) {
  try { await requirePermission(PERMISSIONS.manage.propertySelfDelete); const actorAccountId = await requireIdentity(); await deleteProperty({ propertyId }, { actorAccountId }); revalidatePath('/manage/properties'); return { success: true }; }
  catch (error) { await logProblem(error, `deletePropertyAction (ID: ${propertyId})`); return { success: false, error: 'Failed to delete property.' }; }
}

export async function requestPropertyDeletionAction(propertyId: string) {
  try {
    await requirePermission(PERMISSIONS.manage.propertySelfDelete); const accountId = await requireIdentity();
    const existingDraft = await prisma.propertyChange.findFirst({ where: { propertyId, accountId, status: 'deleting', isApproved: null }, orderBy: { modifiedOn: 'desc' }, select: { id: true, data: true } });
    const data = existingDraft?.data && typeof existingDraft.data === 'object' && !Array.isArray(existingDraft.data) ? normalizePropertyChangeData(existingDraft.data as Record<string, any>) : {};
    await prisma.propertyChange.upsert({ where: { id: existingDraft?.id ?? '__new_property_change__' }, update: { status: 'deleting', data, modifiedOn: new Date() }, create: { propertyId, accountId, status: 'deleting', isApproved: null, data } });
    revalidatePath('/manage/properties'); revalidatePath(`/manage/properties/${propertyId}`); return { success: true };
  } catch (error) { await logProblem(error, `requestPropertyDeletionAction (ID: ${propertyId})`); return { success: false, error: 'Failed to request property deletion.' }; }
}

export async function cancelPropertyChangeDraftAction(changeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const accountId = await requireIdentity();
    const draft = await prisma.propertyChange.findFirst({ where: { id: changeId, accountId, isApproved: null }, select: { id: true, propertyId: true, status: true } });
    if (!draft) return { success: false, error: 'Pending request not found.' };
    await requirePermission(draft.status === 'deleting' ? PERMISSIONS.manage.propertySelfDelete : PERMISSIONS.manage.propertySelfUpdate);
    if (draft.status === 'deleting' && draft.propertyId) await prisma.property.update({ where: { id: draft.propertyId }, data: { status: 'ACTIVE' } });
    await prisma.propertyChange.delete({ where: { id: draft.id } });
    return { success: true };
  } catch (error) { await logProblem(error, `cancelPropertyChangeDraftAction ${changeId}`); return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel property change draft.' }; }
}

export async function reviewPropertyChangeAction(input: { changeId: string; propertyId?: string | null; approve: boolean; acceptedFields?: string[] }): Promise<{ success: boolean; error?: string; propertyId?: string | null }> {
  try {
    await requirePermission(PERMISSIONS.manage.propertyReviewApprove);
    const accountId = await requireIdentity();
    const request = await prisma.propertyChange.findFirst({ where: { id: input.changeId, ...(input.propertyId ? { propertyId: input.propertyId } : {}), isApproved: null } });
    if (!request) return { success: false, error: 'Pending request not found.' };
    if (!input.approve) { await prisma.propertyChange.update({ where: { id: request.id }, data: { isApproved: false, modifiedOn: new Date() } }); return { success: true, propertyId: request.propertyId }; }
    if (request.status === 'deleting' && request.propertyId) await deleteProperty({ propertyId: request.propertyId }, { actorAccountId: accountId });
    await prisma.propertyChange.update({ where: { id: request.id }, data: { isApproved: true, modifiedOn: new Date() } });
    return { success: true, propertyId: request.propertyId };
  } catch (error) { await logProblem(error, `reviewPropertyChangeAction ${input.propertyId}/${input.changeId}`); return { success: false, error: error instanceof Error ? error.message : 'Failed to review property change.' }; }
}
