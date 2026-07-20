'use server';

/*
::neup.documentation::property-service-reject

Rejects a property by keeping it out of the active approved listing set.

::end
*/

import { prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';
import { PROPERTY_STATUS } from './shared';

export async function rejectProperty(propertyId: string): Promise<void> {
  try {
    await prisma.property.update({
      where: { id: propertyId },
      data: { status: PROPERTY_STATUS.PENDING, isApproved: false },
    });
  } catch (e) {
    await logProblem(e, `rejectProperty ${propertyId}`);
    throw new Error('Failed to reject property.');
  }
}
