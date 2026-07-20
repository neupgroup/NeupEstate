'use server';

/*
::neup.documentation::property-service-approve

Approves a property by making it active and publicly approved.

::end
*/

import { prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';
import { PROPERTY_STATUS } from './shared';

export async function approveProperty(propertyId: string): Promise<void> {
  try {
    await prisma.property.update({ where: { id: propertyId }, data: { status: PROPERTY_STATUS.ACTIVE, isApproved: true } });
  } catch (e) { await logProblem(e, `approveProperty ${propertyId}`); throw new Error('Failed to approve property.'); }
}
