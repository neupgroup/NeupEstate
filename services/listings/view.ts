'use server';

/*
::neup.documentation::property-service-view

Single-property lookup, review-log, and saved-property read services.

::end
*/

import { prisma } from '@neup/core/database/prisma';
import { logger } from "@neup/logica/logger";
import type { Listing } from '@/types';
import { PROPERTY_INCLUDE, type SavedListingEntry, hydrateListingAccountLabels, mapRecord, onlyActive } from '../listings/shared';
import { parseListingSlugId } from './slug';



/**
 * getPropertyById handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getListingById(id: string, opts: { includeInactive?: boolean } = {}): Promise<Listing | null> {
  try {
    const record = await prisma.listing.findUnique({ where: { id }, include: PROPERTY_INCLUDE });
    if (!record) return null;
    const [p] = await hydrateListingAccountLabels([mapRecord(record)]);
    return opts.includeInactive ? p : (p.isApproved ? p : null);
  } catch (e) { await logger().type(`getPropertyById ${id}`).data({ error: String(e), details: {} }).log(); return null; }
}



/**
 * getPropertyBySlug handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getListingBySlug(slug: string, opts: { includeInactive?: boolean } = {}): Promise<Listing | null> {
  try {
    const parsed = parseListingSlugId(slug);
    const record = parsed
      ? await prisma.listing.findUnique({ where: { id: parsed.id }, include: PROPERTY_INCLUDE })
      : await prisma.listing.findFirst({ where: { slug }, include: PROPERTY_INCLUDE });
    if (record) {
      const [p] = await hydrateListingAccountLabels([mapRecord(record)]);
      return opts.includeInactive ? p : (p.isApproved ? p : null);
    }
    return getListingById(slug, opts);
  } catch (e) { await logger().type(`getPropertyBySlug ${slug}`).data({ error: String(e), details: {} }).log(); return null; }
}



/**
 * getPropertyReviewRequests handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getListingReviewRequests(propertyId: string): Promise<Array<{
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
    const rows = await prisma.listingChange.findMany({
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
export async function createListingLog(input: {
  propertyId: string;
  requestedBy: string;
  approvedBy?: string | null;
  data: Record<string, any>[];
  approvedOn?: Date | null;
}): Promise<void> {
  try {
    await prisma.listingChange.create({
      data: {
        propertyId: input.propertyId,
        accountId: input.requestedBy,
        approvedBy: input.approvedBy ?? null,
        isApproved: input.approvedBy ? true : null,
        status: input.approvedBy ? 'approved' : 'accepted',
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
export async function getListingLogs(propertyId: string): Promise<Array<{
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
    const logs = await prisma.listingChange.findMany({
      where: { propertyId },
      orderBy: [{ requestedOn: 'desc' }, { id: 'desc' }],
    });

    const accountIds = Array.from(
      new Set(
        logs.flatMap((log) => [log.accountId, log.approvedBy].filter((id): id is string => Boolean(id))),
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
      requestedBy: log.accountId ?? '',
      approvedBy: log.approvedBy,
      data: Array.isArray(log.data) ? log.data as Record<string, any>[] : [],
      requestedOn: log.requestedOn.toISOString(),
      approvedOn: log.approvedOn ? log.approvedOn.toISOString() : null,
      requestedByAccount: log.accountId ? accountMap.get(log.accountId) ?? null : null,
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
export async function isListingSaved(userId: string, propertyId: string): Promise<boolean> {
  try {
    const existing = await prisma.savedProperty.findFirst({ where: { accountId: userId, propertyId } });
    return Boolean(existing);
  } catch (e) { await logger().type('isPropertySaved').data({ error: String(e), details: {} }).log(); return false; }
}



/**
 * toggleSavedListing handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function toggleSavedListing(userId: string, propertyId: string): Promise<{ saved: boolean }> {
  try {
    const existing = await prisma.savedProperty.findFirst({ where: { accountId: userId, propertyId } });
    if (existing) {
      await prisma.savedProperty.deleteMany({ where: { accountId: userId, propertyId } });
      return { saved: false };
    }
    await prisma.savedProperty.create({ data: { accountId: userId, propertyId } });
    return { saved: true };
  } catch (e) { await logger().type('toggleSavedListing').data({ error: String(e), details: {} }).log(); throw new Error('Failed to toggle saved property.'); }
}



/**
 * getSavedProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getSavedListings(userId: string): Promise<Listing[]> {
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
export async function getLatestSavedListings(limit = 20): Promise<SavedListingEntry[]> {
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
 * getUsersBySavedListing handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getUsersBySavedListing(propertyId: string) {
  try {
    return await prisma.savedProperty.findMany({ where: { propertyId }, orderBy: { savedAt: 'desc' } });
  } catch (e) { await logger().type(`getUsersBySavedListing ${propertyId}`).data({ error: String(e), details: {} }).log(); return []; }
}

// Alias kept for backward compatibility with actions.ts
/**
 * getSavedPropertiesForUser handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getSavedListingsForUser(userId: string): Promise<Listing[]> {
  return getSavedListings(userId);
}
