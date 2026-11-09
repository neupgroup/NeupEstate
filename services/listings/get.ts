import { prisma } from '@neup/core/database/prisma';
import { logger } from "@neup/logica/logger";
import { mapTypeFromEnum } from '@/inapp/database/adapters';
import { formatLocationWithParent, normalizeListingChangeStatus, type ListingDraftSummary } from '@/services/listings/shared';



/**
 * getPropertyDrafts handles the property-service operation, including its input normalization, domain rules, persistence, and returned application value.
 *
 * Callers should provide the typed values described by the signature; transport-specific parsing and response handling remain outside this service.
 */
export async function getListingDrafts(accountId: string): Promise<ListingDraftSummary[]> {
  try {
    const drafts = await prisma.listingChange.findMany({
      where: { accountId, isApproved: null, status: { in: ['creation_draft', 'creation_pending', 'changing', 'deleting', 'creating'] } },
      orderBy: { modifiedOn: 'desc' },
      include: { property: { select: { id: true, title: true, type: true, locationRecord: { select: { title: true, parent: { select: { title: true } } } } } } },
    });
    return drafts.map((draft) => {
      const data = draft.data && typeof draft.data === 'object' && !Array.isArray(draft.data) ? draft.data as Record<string, any> : {};
      const location = data.structuredLocation && typeof data.structuredLocation === 'object' ? [data.structuredLocation.street, data.structuredLocation.municipality, data.structuredLocation.district, data.structuredLocation.province].filter(Boolean).join(', ') : '';
      return { id: draft.id, propertyId: draft.propertyId, title: String(data.title || draft.property?.title || 'Unfinished property draft'), location: String(data.location || location || formatLocationWithParent(draft.property?.locationRecord) || ''), category: String(data.category || (draft.property?.type ? mapTypeFromEnum(draft.property.type) : '') || ''), status: normalizeListingChangeStatus(draft.status) as ListingDraftSummary['status'], modifiedOn: draft.modifiedOn.toISOString() };
    });
  } catch (error) {
    await logger().type(`getPropertyDrafts ${accountId}`).data({ error: String(error), details: {} }).log();
    return [];
  }
}
