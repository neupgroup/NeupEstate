'use server';

/*
::neup.documentation::property-service-delete

Deletes a property record by id.

::end
*/

import { prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';

export async function deleteProperty(propertyId: string): Promise<void> {
  try {
    await prisma.property.delete({ where: { id: propertyId } });
  } catch (e) { await logProblem(e, `deleteProperty ${propertyId}`); throw new Error('Failed to delete property.'); }
}
