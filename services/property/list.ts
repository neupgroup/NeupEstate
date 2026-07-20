'use server';

/*
::neup.documentation::property-service-list

Read-side property listing, search, queue, and bridge query services.

::end
*/

import { prisma } from '@/core/database/prisma';
import { logProblem } from '@/services/problem-service';
import type { Property, PropertyFilters } from '@/types';
import { mapPurposeToEnum, mapStatusToEnum, mapTypeFromEnum, mapTypeToEnum } from '@/inapp/database/adapters';
import {
  type AwaitingReviewItem,
  type BridgePropertyQuery,
  type BridgePropertyResult,
  type PropertyDraftSummary,
  PROPERTY_INCLUDE,
  BRIDGE_PROPERTY_DEFAULT_LIMIT,
  BRIDGE_PROPERTY_MAX_LIMIT,
  PROPERTY_STATUS,
  hydratePropertyAccountLabels,
  mapRecord,
  normalizePropertyChangeStatus,
  onlyActive,
  pickPropertyFields,
  resolveBridgePropertyFields,
} from './shared';

export async function getProperties(opts: { includeInactive?: boolean } = {}): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({ orderBy: { updatedAt: 'desc' }, include: PROPERTY_INCLUDE });
    const all = await hydratePropertyAccountLabels(records.map(mapRecord));
    return opts.includeInactive ? all : all.filter(onlyActive);
  } catch (e) { await logProblem(e, 'getProperties'); return []; }
}

export async function getPaginatedProperties(opts: {
  page?: number;
  limit?: number;
  filters?: PropertyFilters;
  includeInactive?: boolean;
  ownerAccountId?: string;
  agentAccountId?: string;
  agencyIds?: string[];
  excludeArchived?: boolean;
} = {}): Promise<{ properties: Property[]; totalCount: number }> {
  try {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.max(1, opts.limit ?? 20);
    const filters = opts.filters ?? {};
    const where: any = {};
    const andClauses: any[] = [];
    const ownershipClauses: any[] = [];

    if (!opts.includeInactive) where.status = PROPERTY_STATUS.ACTIVE;
    if (opts.excludeArchived && !filters.status) {
      where.status = { not: PROPERTY_STATUS.ARCHIVED };
    }
    if (filters.id) where.id = filters.id;
    if (filters.ids?.length) where.id = { in: filters.ids };
    if (filters.status) where.status = mapStatusToEnum(filters.status);
    if (filters.isOwnerListing === true) where.agency = null;
    if (filters.isOwnerListing === false) where.agency = { not: null };
    if (filters.purpose?.length) where.purpose = { in: filters.purpose.map(mapPurposeToEnum) };
    if (filters.category?.length) where.type = { in: filters.category.map(mapTypeToEnum) };
    if (filters.agencyName) where.agency = { contains: filters.agencyName, mode: 'insensitive' };
    if (filters.listingAgent) where.agent = { contains: filters.listingAgent, mode: 'insensitive' };
    if (filters.minBedrooms != null || filters.maxBedrooms != null) {
      where.bedrooms = {
        ...(Number.isFinite(filters.minBedrooms) ? { gte: filters.minBedrooms } : {}),
        ...(Number.isFinite(filters.maxBedrooms) ? { lte: filters.maxBedrooms } : {}),
      };
    }
    if (Number.isFinite(filters.minPrice)) where.displayPrice = { ...where.displayPrice, gte: filters.minPrice };
    if (Number.isFinite(filters.maxPrice)) where.displayPrice = { ...where.displayPrice, lte: filters.maxPrice };
    if (opts.ownerAccountId) where.owners = { some: { ownerClientId: opts.ownerAccountId } };
    if (opts.agentAccountId) ownershipClauses.push({ agent: opts.agentAccountId });
    if (opts.agencyIds?.length) ownershipClauses.push({ agency: { in: opts.agencyIds } });
    if (ownershipClauses.length > 0) {
      andClauses.push({ OR: ownershipClauses });
    }
    if (filters.searchTerm) {
      andClauses.push({
        OR: [
          { title: { contains: filters.searchTerm, mode: 'insensitive' } },
          { description: { contains: filters.searchTerm, mode: 'insensitive' } },
          { locationText: { contains: filters.searchTerm, mode: 'insensitive' } },
        ],
      });
    }
    if (filters.location) {
      andClauses.push({
        OR: [
          { locationText: { contains: filters.location, mode: 'insensitive' } },
          { structuredLocation: { contains: filters.location, mode: 'insensitive' } },
        ],
      });
    }
    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const [totalCount, records] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({ where, orderBy: { updatedAt: 'desc' }, take: limit, skip: (page - 1) * limit, include: PROPERTY_INCLUDE }),
    ]);
    return { properties: await hydratePropertyAccountLabels(records.map(mapRecord)), totalCount };
  } catch (e) { await logProblem(e, 'getPaginatedProperties'); return { properties: [], totalCount: 0 }; }
}

export async function getPropertyDrafts(accountId: string): Promise<PropertyDraftSummary[]> {
  try {
    const drafts = await prisma.propertyChange.findMany({
      where: {
        accountId,
        isApproved: null,
        status: {
          in: ['creation_draft', 'creation_pending', 'changing', 'deleting', 'creating'],
        },
      },
      orderBy: { modifiedOn: 'desc' },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            locationText: true,
            type: true,
          },
        },
      },
    });

    return drafts.map((draft) => {
      const data = (draft.data && typeof draft.data === 'object' && !Array.isArray(draft.data))
        ? draft.data as Record<string, any>
        : {};
      const purposes = Array.isArray(data.purposes) ? data.purposes.filter(Boolean) : [];
      const categories = Array.isArray(data.categories) ? data.categories.filter(Boolean) : [];
      const types = Array.isArray(data.types) ? data.types.filter(Boolean) : [];
      const locationParts = data.structuredLocation && typeof data.structuredLocation === 'object'
        ? [
            data.structuredLocation.street,
            data.structuredLocation.municipality,
            data.structuredLocation.district,
            data.structuredLocation.province,
          ].filter(Boolean)
        : [];

      return {
        id: draft.id,
        propertyId: draft.propertyId,
        title: String(data.title || draft.property?.title || 'Unfinished property draft'),
        location: String(data.location || locationParts.join(', ') || draft.property?.locationText || ''),
        category: String(categories[0] || types[0] || (draft.property?.type ? mapTypeFromEnum(draft.property.type) : '') || purposes[0] || ''),
        status: normalizePropertyChangeStatus(draft.status) as PropertyDraftSummary['status'],
        modifiedOn: draft.modifiedOn.toISOString(),
      };
    });
  } catch (e) {
    await logProblem(e, `getPropertyDrafts ${accountId}`);
    return [];
  }
}

export async function getFeaturedProperties(limit = 4): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({ where: { isFeatured: true, status: PROPERTY_STATUS.ACTIVE }, orderBy: { updatedAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    if (records.length > 0) return hydratePropertyAccountLabels(records.map(mapRecord));
    const fallback = await prisma.property.findMany({ where: { status: PROPERTY_STATUS.ACTIVE }, orderBy: { updatedAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return hydratePropertyAccountLabels(fallback.map(mapRecord));
  } catch (e) { await logProblem(e, 'getFeaturedProperties'); return []; }
}

export async function getRecentProperties(limit = 4): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({ where: { status: PROPERTY_STATUS.ACTIVE }, orderBy: { createdAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return hydratePropertyAccountLabels(records.map(mapRecord));
  } catch (e) { await logProblem(e, 'getRecentProperties'); return []; }
}

export async function getPropertiesByPurpose(purpose: 'Sale' | 'Rent' | 'Lease', limit = 4): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({ where: { purpose: mapPurposeToEnum(purpose), status: PROPERTY_STATUS.ACTIVE }, orderBy: { updatedAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return hydratePropertyAccountLabels(records.map(mapRecord));
  } catch (e) { await logProblem(e, 'getPropertiesByPurpose'); return []; }
}

export async function getFeaturedProjects(limit = 4): Promise<Property[]> {
  return getFeaturedProperties(limit);
}

export async function getPremiumProperties(limit = 4): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({ where: { status: PROPERTY_STATUS.ACTIVE, displayPrice: { gt: 0 } }, orderBy: { displayPrice: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return hydratePropertyAccountLabels(records.map(mapRecord));
  } catch (e) { await logProblem(e, 'getPremiumProperties'); return []; }
}

export async function getLuxuriousProperties(limit = 4): Promise<Property[]> {
  return getPremiumProperties(limit);
}

export async function getPendingProperties(limit = 50): Promise<Property[]> {
  try {
    const records = await prisma.property.findMany({
      where: { status: { in: [PROPERTY_STATUS.AWAITING_CREATION, PROPERTY_STATUS.PENDING] } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: PROPERTY_INCLUDE,
    });
    return records.map(mapRecord);
  } catch (e) { await logProblem(e, 'getPendingProperties'); return []; }
}

export async function getAwaitingReviewItems(
  limit = 50,
  opts: { accountId?: string | null; includeAll?: boolean } = {},
): Promise<AwaitingReviewItem[]> {
  try {
    if (!opts.includeAll && !opts.accountId) {
      return [];
    }

    const reviewChangeWhere = {
      isApproved: null,
      status: { in: ['creation_pending', 'changing', 'deleting', 'creating'] },
      ...(opts.includeAll ? {} : opts.accountId ? { accountId: opts.accountId } : {}),
    };

    const [pendingProperties, drafts] = opts.includeAll
      ? await Promise.all([
          getPendingProperties(limit),
          prisma.propertyChange.findMany({
            where: reviewChangeWhere,
            orderBy: { modifiedOn: 'desc' },
            take: limit,
            include: {
              property: {
                select: {
                  id: true,
                  title: true,
                  locationText: true,
                  type: true,
                },
              },
            },
          }),
        ])
      : [[], await prisma.propertyChange.findMany({
          where: reviewChangeWhere,
          orderBy: { modifiedOn: 'desc' },
          take: limit,
          include: {
            property: {
              select: {
                id: true,
                title: true,
                locationText: true,
                type: true,
              },
            },
          },
        })] as const;

    const draftItems = drafts.map((draft) => {
      const data = (draft.data && typeof draft.data === 'object' && !Array.isArray(draft.data))
        ? draft.data as Record<string, any>
        : {};
      const categories = Array.isArray(data.categories) ? data.categories.filter(Boolean) : [];
      const types = Array.isArray(data.types) ? data.types.filter(Boolean) : [];
      const purposes = Array.isArray(data.purposes) ? data.purposes.filter(Boolean) : [];
      const locationParts = data.structuredLocation && typeof data.structuredLocation === 'object'
        ? [
            data.structuredLocation.street,
            data.structuredLocation.municipality,
            data.structuredLocation.district,
            data.structuredLocation.province,
          ].filter(Boolean)
        : [];

      return {
        id: draft.id,
        propertyId: draft.propertyId ?? undefined,
        title: String(data.title || draft.property?.title || 'Unfinished property draft'),
        location: String(data.location || locationParts.join(', ') || draft.property?.locationText || ''),
        category: String(categories[0] || types[0] || purposes[0] || ''),
        kind: 'draft' as const,
        status: normalizePropertyChangeStatus(draft.status),
        modifiedOn: draft.modifiedOn.toISOString(),
      };
    });

    const propertyItems: AwaitingReviewItem[] = pendingProperties.map((property) => ({
      id: property.id,
      title: property.title,
      location: property.location,
      category: property.category,
      kind: 'property' as const,
      propertyId: property.id,
      status: property.status,
      modifiedOn: property.updatedAt || '',
    }));

    if (!opts.includeAll) {
      const pendingIds = new Set(draftItems.map((item) => item.propertyId).filter((id): id is string => Boolean(id)));
      if (pendingIds.size === 0) {
        return draftItems
          .sort((a, b) => String(b.modifiedOn || '').localeCompare(String(a.modifiedOn || '')))
          .slice(0, limit);
      }

      const scopedProperties = await prisma.property.findMany({
        where: {
          id: { in: Array.from(pendingIds) },
        },
        orderBy: { updatedAt: 'desc' },
        include: PROPERTY_INCLUDE,
      });

      const scopedPropertyItems: AwaitingReviewItem[] = scopedProperties.map((record) => {
        const property = mapRecord(record);
        return {
          id: property.id,
          title: property.title,
          location: property.location,
          category: property.category,
          kind: 'property' as const,
          propertyId: property.id,
          status: property.status,
          modifiedOn: property.updatedAt || '',
        };
      });

      return [...draftItems, ...scopedPropertyItems]
        .sort((a, b) => String(b.modifiedOn || '').localeCompare(String(a.modifiedOn || '')))
        .slice(0, limit);
    }

    return [...draftItems, ...propertyItems]
      .sort((a, b) => String(b.modifiedOn || '').localeCompare(String(a.modifiedOn || '')))
      .slice(0, limit);
  } catch (e) {
    await logProblem(e, 'getAwaitingReviewItems');
    return [];
  }
}

export async function getPropertiesByAgent(agentId: string, opts: { includeInactive?: boolean } = {}): Promise<Property[]> {
  try {
    const where: any = { agent: agentId };
    if (!opts.includeInactive) where.status = PROPERTY_STATUS.ACTIVE;
    const records = await prisma.property.findMany({ where, orderBy: { updatedAt: 'desc' }, include: PROPERTY_INCLUDE });
    return hydratePropertyAccountLabels(records.map(mapRecord));
  } catch (e) { await logProblem(e, `getPropertiesByAgent ${agentId}`); return []; }
}

export async function getBridgePropertiesByAccount(opts: BridgePropertyQuery): Promise<BridgePropertyResult> {
  try {
    const limit = Math.min(Math.max(1, opts.limit ?? BRIDGE_PROPERTY_DEFAULT_LIMIT), BRIDGE_PROPERTY_MAX_LIMIT);
    const offset = Math.max(0, opts.offset ?? 0);
    const fields = resolveBridgePropertyFields(opts.fields);
    const where: any = {};

    if (opts.agencyId) where.agency = opts.agencyId;
    if (opts.agentId) where.agent = opts.agentId;
    if (!opts.includeInactive) where.status = PROPERTY_STATUS.ACTIVE;

    const [totalCount, records] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: PROPERTY_INCLUDE,
      }),
    ]);

    const properties = records
      .map(mapRecord)
      .map((property) => pickPropertyFields(property, fields));

    return { properties, totalCount, limit, offset };
  } catch (e) {
    await logProblem(e, `getBridgePropertiesByAccount ${opts.agencyId || opts.agentId || 'unknown'}`);
    return {
      properties: [],
      totalCount: 0,
      limit: Math.min(Math.max(1, opts.limit ?? BRIDGE_PROPERTY_DEFAULT_LIMIT), BRIDGE_PROPERTY_MAX_LIMIT),
      offset: Math.max(0, opts.offset ?? 0),
    };
  }
}
