'use server';

/*
::neup.documentation::property-service-view

Single-property lookup, review-log, and saved-property read services.

::end
*/

import { prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';
import type { Property } from '@/types';
import { PROPERTY_INCLUDE, type SavedPropertyEntry, hydratePropertyAccountLabels, mapRecord, onlyActive } from './shared';

export async function getPropertyById(id: string, opts: { includeInactive?: boolean } = {}): Promise<Property | null> {
  try {
    const record = await prisma.property.findUnique({ where: { id }, include: PROPERTY_INCLUDE });
    if (!record) return null;
    const [p] = await hydratePropertyAccountLabels([mapRecord(record)]);
    return opts.includeInactive ? p : (p.isApproved ? p : null);
  } catch (e) { await logProblem(e, `getPropertyById ${id}`); return null; }
}

export async function getPropertyBySlug(slug: string, opts: { includeInactive?: boolean } = {}): Promise<Property | null> {
  try {
    const record = await prisma.property.findFirst({ where: { slug }, include: PROPERTY_INCLUDE });
    if (record) {
      const [p] = await hydratePropertyAccountLabels([mapRecord(record)]);
      return opts.includeInactive ? p : (p.isApproved ? p : null);
    }
    return getPropertyById(slug, opts);
  } catch (e) { await logProblem(e, `getPropertyBySlug ${slug}`); return null; }
}

export async function getPropertyReviewRequests(propertyId: string): Promise<Array<{
  id: string;
  propertyId?: string;
  accountId: string;
  status: string;
  isApproved: boolean | null;
  data: Record<string, any>;
  createdOn: string;
  modifiedOn: string;
  account?: {
    displayName?: string | null;
    neupId?: string | null;
  } | null;
}>> {
  try {
    const rows = await prisma.propertyChange.findMany({
      where: {
        propertyId,
        isApproved: null,
      },
      orderBy: { modifiedOn: 'desc' },
      include: {
        account: {
          select: {
            displayName: true,
            neupId: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      propertyId: row.propertyId ?? undefined,
      accountId: row.accountId,
      status: row.status,
      isApproved: row.isApproved,
      data: row.data as Record<string, any>,
      createdOn: row.createdOn.toISOString(),
      modifiedOn: row.modifiedOn.toISOString(),
      account: row.account ? {
        displayName: row.account.displayName,
        neupId: row.account.neupId,
      } : null,
    }));
  } catch (e) {
    await logProblem(e, `getPropertyReviewRequests ${propertyId}`);
    return [];
  }
}

export async function createPropertyLog(input: {
  propertyId: string;
  requestedBy: string;
  approvedBy?: string | null;
  data: Record<string, any>[];
  approvedOn?: Date | null;
}): Promise<void> {
  try {
    await prisma.propertyLog.create({
      data: {
        propertyId: input.propertyId,
        requestedBy: input.requestedBy,
        approvedBy: input.approvedBy ?? null,
        data: input.data as any,
        approvedOn: input.approvedOn ?? null,
      },
    });
  } catch (e) {
    await logProblem(e, `createPropertyLog ${input.propertyId}`);
  }
}

export async function getPropertyLogs(propertyId: string): Promise<Array<{
  id: string;
  propertyId: string;
  requestedBy: string;
  approvedBy: string | null;
  data: Record<string, any>[];
  requestedOn: string;
  approvedOn: string | null;
  requestedByAccount: { id: string; displayName: string | null; neupId: string | null } | null;
  approvedByAccount: { id: string; displayName: string | null; neupId: string | null } | null;
}>> {
  try {
    const logs = await prisma.propertyLog.findMany({
      where: { propertyId },
      orderBy: [{ requestedOn: 'desc' }, { id: 'desc' }],
    });

    const accountIds = Array.from(
      new Set(
        logs.flatMap((log) => [log.requestedBy, log.approvedBy].filter((id): id is string => Boolean(id))),
      ),
    );

    const accounts = accountIds.length
      ? await prisma.account.findMany({
          where: { id: { in: accountIds } },
          select: { id: true, displayName: true, neupId: true },
        })
      : [];

    const accountMap = new Map(accounts.map((account) => [account.id, account]));

    return logs.map((log) => ({
      id: log.id,
      propertyId: log.propertyId,
      requestedBy: log.requestedBy,
      approvedBy: log.approvedBy,
      data: Array.isArray(log.data) ? log.data as Record<string, any>[] : [],
      requestedOn: log.requestedOn.toISOString(),
      approvedOn: log.approvedOn ? log.approvedOn.toISOString() : null,
      requestedByAccount: accountMap.get(log.requestedBy) ?? null,
      approvedByAccount: log.approvedBy ? accountMap.get(log.approvedBy) ?? null : null,
    }));
  } catch (e) {
    await logProblem(e, `getPropertyLogs ${propertyId}`);
    return [];
  }
}

// ─── Saved Properties ─────────────────────────────────────────────────────────

export async function isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
  try {
    const existing = await prisma.savedProperty.findFirst({ where: { accountId: userId, propertyId } });
    return Boolean(existing);
  } catch (e) { await logProblem(e, 'isPropertySaved'); return false; }
}

export async function toggleSavedProperty(userId: string, propertyId: string): Promise<{ saved: boolean }> {
  try {
    const existing = await prisma.savedProperty.findFirst({ where: { accountId: userId, propertyId } });
    if (existing) {
      await prisma.savedProperty.deleteMany({ where: { accountId: userId, propertyId } });
      return { saved: false };
    }
    await prisma.savedProperty.create({ data: { accountId: userId, propertyId } });
    return { saved: true };
  } catch (e) { await logProblem(e, 'toggleSavedProperty'); throw new Error('Failed to toggle saved property.'); }
}

export async function getSavedProperties(userId: string): Promise<Property[]> {
  try {
    const saved = await prisma.savedProperty.findMany({ where: { accountId: userId }, include: { property: { include: PROPERTY_INCLUDE } }, orderBy: { savedAt: 'desc' } });
    return saved.map((e) => e.property).filter(Boolean).map(mapRecord).filter(onlyActive);
  } catch (e) { await logProblem(e, `getSavedProperties ${userId}`); return []; }
}

export async function getLatestSavedProperties(limit = 20): Promise<SavedPropertyEntry[]> {
  try {
    const saved = await prisma.savedProperty.findMany({ orderBy: { savedAt: 'desc' }, take: limit, include: { property: { include: PROPERTY_INCLUDE } } });
    return saved.map((e) => ({
      userId: e.accountId,
      userName: 'Unknown User',
      propertyId: e.propertyId,
      propertyTitle: e.property?.title || 'Unknown Property',
      savedAt: e.savedAt.toISOString(),
    }));
  } catch (e) { await logProblem(e, 'getLatestSavedProperties'); return []; }
}

export async function getUsersBySavedProperty(propertyId: string) {
  try {
    return await prisma.savedProperty.findMany({ where: { propertyId }, orderBy: { savedAt: 'desc' } });
  } catch (e) { await logProblem(e, `getUsersBySavedProperty ${propertyId}`); return []; }
}

// Alias kept for backward compatibility with actions.ts
export async function getSavedPropertiesForUser(userId: string): Promise<Property[]> {
  return getSavedProperties(userId);
}
