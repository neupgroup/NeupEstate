'use server';

/*
::neup.documentation::property-service-list

Read-side property listing, search, queue, and bridge query services.

::end
*/

import { prisma } from '@neup/core/database/prisma';
import { logger } from "@neup/logica/logger";
import type { Listing, ListingFilters } from '@/types';
import { mapPurposeToEnum, mapStatusToEnum, mapTypeFromEnum, mapTypeToEnum } from '@/inapp/database/adapters';
import {
  type AwaitingReviewItem,
  type BridgeListingQuery,
  type BridgeListingResult,
  type ListingDraftSummary,
  PROPERTY_INCLUDE,
  BRIDGE_PROPERTY_DEFAULT_LIMIT,
  BRIDGE_PROPERTY_MAX_LIMIT,
  PROPERTY_STATUS,
  hydrateListingAccountLabels,
  mapRecord,
  normalizeListingChangeStatus,
  onlyActive,
  pickListingFields,
  resolveBridgeListingFields,
} from '../listings/shared';



/**
 * getProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getListings(opts: { includeInactive?: boolean } = {}): Promise<Listing[]> {
  try {
    const records = await prisma.listing.findMany({ orderBy: { updatedAt: 'desc' }, include: PROPERTY_INCLUDE });
    const all = await hydrateListingAccountLabels(records.map(mapRecord));
    return opts.includeInactive ? all : all.filter(onlyActive);
  } catch (e) { await logger().type('getProperties').data({ error: String(e), details: {} }).log(); return []; }
}



/**
 * getPaginatedProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getPaginatedListings(opts: {
  page?: number;
  offset?: number;
  limit?: number;
  filters?: ListingFilters;
  includeInactive?: boolean;
  ownerAccountId?: string;
  agentAccountId?: string;
  agencyIds?: string[];
  excludeArchived?: boolean;
  statuses?: string[];
  orderBy?: 'newestFirst' | 'oldestFirst';
} = {}): Promise<{ listings: Listing[]; totalCount: number }> {
  try {
    const page = Math.max(1, opts.page ?? 1);
    const offset = Math.max(0, opts.offset ?? (page - 1) * (opts.limit ?? 20));
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
    if (opts.statuses?.length) {
      const normalizedStatuses = [...new Set(opts.statuses.map((status) => status.trim().toLowerCase().replace(/[\s-]+/g, '_')))];
      const statusValues = normalizedStatuses
        .filter((status) => status !== 'rejected' && status !== 'draft' && status !== 'drafts')
        .map((status) => mapStatusToEnum(status));
      const statusConditions: any[] = [];
      if (statusValues.length) statusConditions.push({ status: { in: [...new Set(statusValues)] } });

      const exceptionalStatusQueries: Promise<Array<{ id: string }>>[] = [];
      if (normalizedStatuses.includes('rejected')) {
        exceptionalStatusQueries.push(prisma.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "property" WHERE "status"::text = 'REJECTED'
        `);
      }
      if (normalizedStatuses.includes('draft') || normalizedStatuses.includes('drafts')) {
        exceptionalStatusQueries.push(prisma.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "property" WHERE "status"::text IN ('DRAFT', 'DRAFTS')
        `);
      }
      if (exceptionalStatusQueries.length) {
        const exceptionalRows = (await Promise.all(exceptionalStatusQueries)).flat();
        const exceptionalIds = exceptionalRows.map((row) => row.id);
        if (exceptionalIds.length) statusConditions.push({ id: { in: exceptionalIds } });
      }

      if (normalizedStatuses.includes('draft') || normalizedStatuses.includes('drafts')) {
        statusConditions.push({ status: PROPERTY_STATUS.AWAITING_CREATION });
      }
      andClauses.push({ OR: statusConditions.length ? statusConditions : [{ id: { in: [] } }] });
    }
    const agencyAccountTypes = ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'];
    if (filters.isOwnerListing === true) {
      andClauses.push({ representatives: { none: { role: 'listingOwner', representative: { accountType: { in: agencyAccountTypes } } } } });
    }
    if (filters.isOwnerListing === false) {
      andClauses.push({ representatives: { some: { role: 'listingOwner', representative: { accountType: { in: agencyAccountTypes } } } } });
    }
    if (filters.purpose?.length) where.purpose = { in: filters.purpose.map(mapPurposeToEnum) };
    if (filters.category?.length) where.type = { in: filters.category.map(mapTypeToEnum) };
    // Match the same usage classification exposed by mapRecord.
    if (filters.type?.length) {
      const categories = [
        ...(filters.type.includes('Commercial') ? ['COMMERCIAL'] : []),
        ...(filters.type.includes('Residential') ? ['HOUSE', 'APARTMENT', 'LAND'] : []),
      ];
      andClauses.push({ type: { in: categories } });
    }
    if (filters.agencyName) {
      andClauses.push({ representatives: { some: { role: 'listingOwner', representative: { accountType: { in: agencyAccountTypes }, displayName: { contains: filters.agencyName, mode: 'insensitive' } } } } });
    }
    if (filters.listingBy?.length) {
      const listingClauses: any[] = [];
      if (filters.listingBy.includes('owners')) {
        listingClauses.push({ representatives: { none: { role: 'listingOwner', representative: { accountType: { in: agencyAccountTypes } } } } });
      }
      if (filters.listingBy.includes('developers')) {
        listingClauses.push({ representatives: { some: { role: 'listingOwner', representative: { accountType: { notIn: agencyAccountTypes } } } } });
      }
      if (filters.listingBy.includes('agencies')) {
        listingClauses.push({ representatives: { some: { role: 'listingOwner', representative: { accountType: { in: agencyAccountTypes } } } } });
      }
      if (listingClauses.length) andClauses.push({ OR: listingClauses });
    }
    if (filters.listingAgent) {
      andClauses.push({ representatives: { some: { role: 'listingOwner', representative: { accountType: { notIn: agencyAccountTypes }, displayName: { contains: filters.listingAgent, mode: 'insensitive' } } } } });
    }
    const detailRanges = [
      ['bedrooms', filters.bedrooms, filters.minBedrooms, filters.maxBedrooms],
      ['bathrooms', filters.bathrooms, filters.minBathrooms, filters.maxBathrooms],
      ['kitchens', filters.kitchens, filters.minKitchens, filters.maxKitchens],
      ['diningRooms', filters.diningRooms, filters.minDiningRooms, filters.maxDiningRooms],
      ['livingRooms', filters.livingRooms, filters.minLivingRooms, filters.maxLivingRooms],
      ['carParkingSpots', filters.carParkingSpots, filters.minCarParkingSpots, filters.maxCarParkingSpots],
      ['bikeParkingSpots', filters.bikeParkingSpots, filters.minBikeParkingSpots, filters.maxBikeParkingSpots],
    ] as const;
    for (const [field, exact, minimum, maximum] of detailRanges) {
      if (field === 'bedrooms' && (minimum != null || maximum != null)) continue;
      const range: Record<string, number> = {
        ...(Number.isFinite(minimum) ? { gte: minimum as number } : {}),
        ...(Number.isFinite(maximum) ? { lte: maximum as number } : {}),
      };
      if (Number.isFinite(exact)) range.equals = exact as number;
      if (!Object.keys(range).length) continue;
      andClauses.push({
        OR: [
          { houseDetail: { is: { [field]: range } } },
          { apartmentDetail: { is: { [field]: range } } },
          ...(field === 'carParkingSpots' ? [{ commercialDetail: { is: { parkingSpots: range } } }] : []),
        ],
      });
    }
    if (Number.isFinite(filters.minPrice)) where.displayPrice = { ...where.displayPrice, gte: filters.minPrice };
    if (Number.isFinite(filters.maxPrice)) where.displayPrice = { ...where.displayPrice, lte: filters.maxPrice };
    if (opts.ownerAccountId) where.owners = { some: { ownerClientId: opts.ownerAccountId } };
    if (opts.agentAccountId) ownershipClauses.push({ representatives: { some: { role: 'listingOwner', representativeId: opts.agentAccountId } } });
    if (opts.agencyIds?.length) ownershipClauses.push({ representatives: { some: { role: 'listingOwner', representativeId: { in: opts.agencyIds } } } });
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
    if (filters.tags?.length) {
      andClauses.push({ OR: filters.tags.map((tag) => ({ metaTags: { has: tag } })) });
    }
    if (andClauses.length > 0) {
      where.AND = andClauses;
    }

    const [totalCount, records] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({ where, orderBy: { createdAt: opts.orderBy === 'oldestFirst' ? 'asc' : 'desc' }, take: limit, skip: offset, include: PROPERTY_INCLUDE }),
    ]);
    return { listings: await hydrateListingAccountLabels(records.map(mapRecord)), totalCount };
  } catch (e) { await logger().type('getPaginatedProperties').data({ error: String(e), details: {} }).log(); return { listings: [], totalCount: 0 }; }
}



/**
 * getPropertyDrafts handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getListingDrafts(accountId: string): Promise<ListingDraftSummary[]> {
  try {
    const drafts = await prisma.listingChange.findMany({
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
        category: String(data.category || (draft.property?.type ? mapTypeFromEnum(draft.property.type) : '') || ''),
        status: normalizeListingChangeStatus(draft.status) as ListingDraftSummary['status'],
        modifiedOn: draft.modifiedOn.toISOString(),
      };
    });
  } catch (e) {
    await logger().type(`getPropertyDrafts ${accountId}`).data({ error: String(e), details: {} }).log();
    return [];
  }
}



/**
 * getFeaturedProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getFeaturedListings(limit = 4): Promise<Listing[]> {
  try {
    const records = await prisma.listing.findMany({ where: { isFeatured: true, status: PROPERTY_STATUS.ACTIVE }, orderBy: { updatedAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    if (records.length > 0) return hydrateListingAccountLabels(records.map(mapRecord));
    const fallback = await prisma.listing.findMany({ where: { status: PROPERTY_STATUS.ACTIVE }, orderBy: { updatedAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return hydrateListingAccountLabels(fallback.map(mapRecord));
  } catch (e) { await logger().type('getFeaturedProperties').data({ error: String(e), details: {} }).log(); return []; }
}



/**
 * getRecentProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getRecentListings(limit = 4): Promise<Listing[]> {
  try {
    const records = await prisma.listing.findMany({ where: { status: PROPERTY_STATUS.ACTIVE }, orderBy: { createdAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return hydrateListingAccountLabels(records.map(mapRecord));
  } catch (e) { await logger().type('getRecentProperties').data({ error: String(e), details: {} }).log(); return []; }
}



/**
 * getPropertiesByPurpose handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getListingsByPurpose(purpose: 'Sale' | 'Rent' | 'Lease', limit = 4): Promise<Listing[]> {
  try {
    const records = await prisma.listing.findMany({ where: { purpose: mapPurposeToEnum(purpose), status: PROPERTY_STATUS.ACTIVE }, orderBy: { updatedAt: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return hydrateListingAccountLabels(records.map(mapRecord));
  } catch (e) { await logger().type('getPropertiesByPurpose').data({ error: String(e), details: {} }).log(); return []; }
}



/**
 * getFeaturedProjects handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getFeaturedProjects(limit = 4): Promise<Listing[]> {
  return getFeaturedListings(limit);
}



/**
 * getPremiumProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getPremiumListings(limit = 4): Promise<Listing[]> {
  try {
    const records = await prisma.listing.findMany({ where: { status: PROPERTY_STATUS.ACTIVE, displayPrice: { gt: 0 } }, orderBy: { displayPrice: 'desc' }, take: limit, include: PROPERTY_INCLUDE });
    return hydrateListingAccountLabels(records.map(mapRecord));
  } catch (e) { await logger().type('getPremiumProperties').data({ error: String(e), details: {} }).log(); return []; }
}



/**
 * getLuxuriousProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getLuxuriousListings(limit = 4): Promise<Listing[]> {
  return getPremiumListings(limit);
}



/**
 * getPendingProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getPendingListings(limit = 50): Promise<Listing[]> {
  try {
    const records = await prisma.listing.findMany({
      where: { status: { in: [PROPERTY_STATUS.AWAITING_CREATION, PROPERTY_STATUS.PENDING] } },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: PROPERTY_INCLUDE,
    });
    return records.map(mapRecord);
  } catch (e) { await logger().type('getPendingProperties').data({ error: String(e), details: {} }).log(); return []; }
}



/**
 * getAwaitingReviewItems handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
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

    const [pendingListings, drafts] = opts.includeAll
      ? await Promise.all([
          getPendingListings(limit),
          prisma.listingChange.findMany({
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
      : [[], await prisma.listingChange.findMany({
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
        category: String(data.category || ''),
        kind: 'draft' as const,
        status: normalizeListingChangeStatus(draft.status),
        modifiedOn: draft.modifiedOn.toISOString(),
      };
    });

    const propertyItems: AwaitingReviewItem[] = pendingListings.map((property) => ({
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

      const scopedListings = await prisma.listing.findMany({
        where: {
          id: { in: Array.from(pendingIds) },
        },
        orderBy: { updatedAt: 'desc' },
        include: PROPERTY_INCLUDE,
      });

      const scopedListingItems: AwaitingReviewItem[] = scopedListings.map((record) => {
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

      return [...draftItems, ...scopedListingItems]
        .sort((a, b) => String(b.modifiedOn || '').localeCompare(String(a.modifiedOn || '')))
        .slice(0, limit);
    }

    return [...draftItems, ...propertyItems]
      .sort((a, b) => String(b.modifiedOn || '').localeCompare(String(a.modifiedOn || '')))
      .slice(0, limit);
  } catch (e) {
    await logger().type('getAwaitingReviewItems').data({ error: String(e), details: {} }).log();
    return [];
  }
}



type AccountListingCollection = 'account' | 'listed' | 'saved' | 'owned' | 'beingWorked';

function normalizeAccountListingPage(offset = 0, limit = 20) {
  return {
    offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0,
    limit: Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20,
  };
}

async function listAccountListings(
  accountId: string,
  offset: number,
  limit: number,
  collection: AccountListingCollection,
): Promise<Listing[]> {
  const page = normalizeAccountListingPage(offset, limit);
  try {
    if (collection === 'saved') {
      const saved = await prisma.savedProperty.findMany({
        where: { accountId, property: { isApproved: true, isDeleted: false } },
        orderBy: { savedAt: 'desc' },
        distinct: ['propertyId'],
        skip: page.offset,
        take: page.limit,
        include: { property: { include: PROPERTY_INCLUDE } },
      });
      const listings = saved.map((entry) => entry.property).filter(Boolean).map(mapRecord).filter(onlyActive);
      return hydrateListingAccountLabels(listings);
    }

    const representativeRoles = collection === 'listed'
      ? ['listingOwner', 'listingOwner_propertyOwner']
      : collection === 'owned'
        ? ['propertyOwner', 'listingOwner_propertyOwner']
        : collection === 'beingWorked'
          ? ['listingParty']
          : undefined;
    const relation = representativeRoles
      ? { representatives: { some: { representativeId: accountId, role: { in: representativeRoles } } } }
      : { representatives: { some: { representativeId: accountId } } };
    const where: any = { isDeleted: false, ...relation };
    if (collection === 'listed') where.status = PROPERTY_STATUS.ACTIVE;
    if (collection === 'owned') {
      where.OR = [
        relation,
        { owners: { some: { ownerClient: { belongsTo: accountId } } } },
      ];
      delete where.representatives;
    }
    if (collection === 'beingWorked') {
      where.OR = [
        relation,
        { changes: { some: { accountId, isApproved: null, status: { in: ['changing', 'deleting'] } } } },
      ];
      delete where.representatives;
    }

    const records = await prisma.listing.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: page.offset,
      take: page.limit,
      include: PROPERTY_INCLUDE,
    });
    return hydrateListingAccountLabels(records.map(mapRecord));
  } catch (error) {
    await logger().type(`getProperties${collection} ${accountId}`).data({ error: String(error), details: {} }).log();
    return [];
  }
}

/** Lists properties represented by an account in any role. */
export async function getListingsByAccount(accountId: string, offset = 0, limit = 20): Promise<Listing[]> {
  return await listAccountListings(accountId, offset, limit, 'account');
}

/** Lists active properties where the account is a listing owner. */
export async function getListingsListed(accountId: string, offset = 0, limit = 20): Promise<Listing[]> {
  return await listAccountListings(accountId, offset, limit, 'listed');
}

/** Lists active properties saved by the account. */
export async function getListingsSaved(accountId: string, offset = 0, limit = 20): Promise<Listing[]> {
  return await listAccountListings(accountId, offset, limit, 'saved');
}

/** Lists properties the account represents as owner or owns through its client records. */
export async function getListingsOwned(accountId: string, offset = 0, limit = 20): Promise<Listing[]> {
  return await listAccountListings(accountId, offset, limit, 'owned');
}

/** Lists properties assigned to the account as a listing party or with an open change request. */
export async function getListingsBeingWorked(accountId: string, offset = 0, limit = 20): Promise<Listing[]> {
  return await listAccountListings(accountId, offset, limit, 'beingWorked');
}



/**
 * getBridgePropertiesByAccount handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getBridgeListingsByAccount(opts: BridgeListingQuery): Promise<BridgeListingResult> {
  try {
    const limit = Math.min(Math.max(1, opts.limit ?? BRIDGE_PROPERTY_DEFAULT_LIMIT), BRIDGE_PROPERTY_MAX_LIMIT);
    const offset = Math.max(0, opts.offset ?? 0);
    const fields = resolveBridgeListingFields(opts.fields);
    const where: any = {};
    const representativeFilters: any[] = [];

    if (opts.agencyId) representativeFilters.push({ representatives: { some: { role: 'listingOwner', representativeId: opts.agencyId, representative: { accountType: { in: ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'] } } } } });
    if (opts.agentId) representativeFilters.push({ representatives: { some: { role: 'listingOwner', representativeId: opts.agentId, representative: { accountType: 'individual.agent' } } } });
    if (representativeFilters.length) where.AND = representativeFilters;
    if (!opts.includeInactive) where.status = PROPERTY_STATUS.ACTIVE;

    const [totalCount, records] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: PROPERTY_INCLUDE,
      }),
    ]);

    const listings = records
      .map(mapRecord)
      .map((property) => pickListingFields(property, fields));

    return { listings, totalCount, limit, offset };
  } catch (e) {
    await logger().type(`getBridgePropertiesByAccount ${opts.agencyId || opts.agentId || 'unknown'}`).data({ error: String(e), details: {} }).log();
    return {
      listings: [],
      totalCount: 0,
      limit: Math.min(Math.max(1, opts.limit ?? BRIDGE_PROPERTY_DEFAULT_LIMIT), BRIDGE_PROPERTY_MAX_LIMIT),
      offset: Math.max(0, opts.offset ?? 0),
    };
  }
}

export type ListListingsInput = { limit: number; offset: number; filters: ListingFilters; agencyId?: string; agentId?: string; orderBy: 'newestFirst' | 'oldestFirst'; fields?: string[]; statuses?: string[] };



/**
 * Canonical collection operation used by both the bridge adapter and server callers.
 * listProperties handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */

export async function listListings(input: ListListingsInput): Promise<BridgeListingResult & { appliedFilters: ListingFilters }> {
  const result = await getPaginatedListings({
    limit: input.limit,
    offset: input.offset,
    filters: input.filters,
    statuses: input.statuses,
    includeInactive: true,
    agencyIds: input.agencyId ? [input.agencyId] : undefined,
    agentAccountId: input.agentId,
    orderBy: input.orderBy,
  });
  const fields = resolveBridgeListingFields(input.fields);
  const listings = result.listings.map((property) => pickListingFields(property, fields));
  await logger().type('property.list').data({ limit: input.limit, offset: input.offset, totalCount: result.totalCount }).log();
  return { listings, totalCount: result.totalCount, limit: input.limit, offset: input.offset, appliedFilters: input.filters };
}
