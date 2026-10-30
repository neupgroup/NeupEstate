'use server';

import { prisma } from '@neup/core/database/prisma';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

const LOCATION_TYPES = new Set([
  'country', 'ruralMunicipality', 'municipality', 'province',
  'subMetropolitanCity', 'metropolitanCity', 'area', 'locality',
]);

// Validates the location fields submitted by the management form.
function readLocationForm(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const type = String(formData.get('type') ?? '').trim();
  const childOf = String(formData.get('childOf') ?? '').trim();
  const postalCode = String(formData.get('postalCode') ?? '').trim();
  const status = String(formData.get('status') ?? 'active').trim();
  if (!title) throw new Error('Title is required.');
  if (!LOCATION_TYPES.has(type)) throw new Error('Select a valid location type.');
  if (!status) throw new Error('Status is required.');
  return { title, type, childOf: childOf || null, postalCode: postalCode || null, status };
}

// Creates a location after verifying its optional parent.
export async function createLocationAction(formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.manage.locationsManage);
  const location = readLocationForm(formData);
  if (location.childOf && !(await prisma.location.findUnique({ where: { id: location.childOf } }))) {
    throw new Error('The selected parent location does not exist.');
  }
  await prisma.location.create({ data: location });
  revalidatePath('/manage/locations');
}

// Updates location fields while preventing direct self-parenting.
export async function updateLocationAction(locationId: string, formData: FormData): Promise<void> {
  await requirePermission(PERMISSIONS.manage.locationsManage);
  const location = readLocationForm(formData);
  if (location.childOf === locationId) throw new Error('A location cannot be its own parent.');
  if (location.childOf && !(await prisma.location.findUnique({ where: { id: location.childOf } }))) {
    throw new Error('The selected parent location does not exist.');
  }
  await prisma.location.update({ where: { id: locationId }, data: location });
  revalidatePath('/manage/locations');
}

// Marks a location inactive without removing it or its descendants.
export async function setLocationInactiveAction(locationId: string): Promise<void> {
  await requirePermission(PERMISSIONS.manage.locationsManage);
  await prisma.location.update({ where: { id: locationId }, data: { status: 'inactive' } });
  revalidatePath('/manage/locations');
}
