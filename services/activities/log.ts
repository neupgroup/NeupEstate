'use server';

import { prisma } from '@neup/core/database/prisma';
import type { CreateUserActivityInput } from '@/types';
import { logger } from '@neup/logica/logger';

export async function logActivity(activityData: CreateUserActivityInput): Promise<string> {
  try {
    if (!activityData.userId) return '';
    const activity = await prisma.activity.create({
      data: {
        accountId: activityData.userId,
        title: activityData.activity,
        details: { page: activityData.page ?? null, propertyId: activityData.propertyId ?? null, duration: activityData.duration ?? null },
        activityOn: new Date(activityData.activityOn),
        ipAddress: 'unknown',
      },
    });
    return activity.id;
  } catch (error) {
    await logger().type('logActivity').data({ error: String(error), details: {} }).log();
    return '';
  }
}
