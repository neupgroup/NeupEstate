'use server';

/*
::neup.documentation::property-service-view

Single-property lookup, review-log, and saved-property read services.

::end
*/

import { prisma } from '@neup/core/database/prisma';
import { logger } from "@neup/logica/logger";
import type { Property } from '@/types';
import { PROPERTY_INCLUDE, type SavedPropertyEntry, hydratePropertyAccountLabels, mapRecord, onlyActive } from '../properties/shared';



/**
 * getPropertyById handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getPropertyById(id: string, opts: { includeInactive?: boolean } = {}): Promise<Property | null> {
  try {
    const record = await prisma.property.findUnique({ where: { id }, include: PROPERTY_INCLUDE });
    if (!record) return null;
    const [p] = await hydratePropertyAccountLabels([mapRecord(record)]);
    return opts.includeInactive ? p : (p.isApproved ? p : null);
  } catch (e) { await logger().type(`getPropertyById ${id}`).data({ error: String(e), details: {} }).log(); return null; }
}



/**
 * getPropertyBySlug handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getPropertyBySlug(slug: string, opts: { includeInactive?: boolean } = {}): Promise<Property | null> {
  try {
    const loggerResponse = await logger().type('property.get.slug.called').data({ slug, includeInactive: Boolean(opts.includeInactive) }).log();
    if (!loggerResponse.ok) console.error('[property.get.slug] Logger request failed.', loggerResponse.status, loggerResponse.body);
    const record = await prisma.property.findFirst({ where: { slug }, include: PROPERTY_INCLUDE });
    if (record) {
      const [p] = await hydratePropertyAccountLabels([mapRecord(record)]);
      return opts.includeInactive ? p : (p.isApproved ? p : null);
    }
    return getPropertyById(slug, opts);
  } catch (e) { await logger().type(`getPropertyBySlug ${slug}`).data({ error: String(e), details: {} }).log(); return null; }
}



/**
 * getPropertyReviewRequests handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
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
    await logger().type(`getPropertyReviewRequests ${propertyId}`).data({ error: String(e), details: {} }).log();
    return [];
  }
}



/**
 * createPropertyLog handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
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
    await logger().type(`createPropertyLog ${input.propertyId}`).data({ error: String(e), details: {} }).log();
  }
}



/**
 * getPropertyLogs handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
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
    await logger().type(`getPropertyLogs ${propertyId}`).data({ error: String(e), details: {} }).log();
    return [];
  }
}

// ─── Saved Properties ─────────────────────────────────────────────────────────



/**
 * isPropertySaved handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
  try {
    const existing = await prisma.savedProperty.findFirst({ where: { accountId: userId, propertyId } });
    return Boolean(existing);
  } catch (e) { await logger().type('isPropertySaved').data({ error: String(e), details: {} }).log(); return false; }
}



/**
 * toggleSavedProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function toggleSavedProperty(userId: string, propertyId: string): Promise<{ saved: boolean }> {
  try {
    const existing = await prisma.savedProperty.findFirst({ where: { accountId: userId, propertyId } });
    if (existing) {
      await prisma.savedProperty.deleteMany({ where: { accountId: userId, propertyId } });
      return { saved: false };
    }
    await prisma.savedProperty.create({ data: { accountId: userId, propertyId } });
    return { saved: true };
  } catch (e) { await logger().type('toggleSavedProperty').data({ error: String(e), details: {} }).log(); throw new Error('Failed to toggle saved property.'); }
}



/**
 * getSavedProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getSavedProperties(userId: string): Promise<Property[]> {
  try {
    const saved = await prisma.savedProperty.findMany({ where: { accountId: userId }, include: { property: { include: PROPERTY_INCLUDE } }, orderBy: { savedAt: 'desc' } });
    return saved.map((e) => e.property).filter(Boolean).map(mapRecord).filter(onlyActive);
  } catch (e) { await logger().type(`getSavedProperties ${userId}`).data({ error: String(e), details: {} }).log(); return []; }
}



/**
 * getLatestSavedProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
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
  } catch (e) { await logger().type('getLatestSavedProperties').data({ error: String(e), details: {} }).log(); return []; }
}



/**
 * getUsersBySavedProperty handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getUsersBySavedProperty(propertyId: string) {
  try {
    return await prisma.savedProperty.findMany({ where: { propertyId }, orderBy: { savedAt: 'desc' } });
  } catch (e) { await logger().type(`getUsersBySavedProperty ${propertyId}`).data({ error: String(e), details: {} }).log(); return []; }
}

// Alias kept for backward compatibility with actions.ts
/**
 * getSavedPropertiesForUser handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getSavedPropertiesForUser(userId: string): Promise<Property[]> {
  return getSavedProperties(userId);
}
