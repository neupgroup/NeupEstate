import { prisma } from '@neup/core/database/prisma';
import { logProblem } from '@/services/problem-service';
import { mapTypeFromEnum } from '@/inapp/database/adapters';
import { normalizePropertyChangeStatus } from '@/services/property/shared';
import type { PropertyDraftSummary } from '@/services/property/shared';

export async function getPropertyDrafts(accountId: string): Promise<PropertyDraftSummary[]> {
  try {
    const drafts = await prisma.propertyChange.findMany({
      where: { accountId, isApproved: null, status: { in: ['creation_draft', 'creation_pending', 'changing', 'deleting', 'creating'] } },
      orderBy: { modifiedOn: 'desc' },
      include: { property: { select: { id: true, title: true, locationText: true, type: true } } },
    });
    return drafts.map((draft) => {
      const data = draft.data && typeof draft.data === 'object' && !Array.isArray(draft.data) ? draft.data as Record<string, any> : {};
      const location = data.structuredLocation && typeof data.structuredLocation === 'object' ? [data.structuredLocation.street, data.structuredLocation.municipality, data.structuredLocation.district, data.structuredLocation.province].filter(Boolean).join(', ') : '';
      return { id: draft.id, propertyId: draft.propertyId, title: String(data.title || draft.property?.title || 'Unfinished property draft'), location: String(data.location || location || draft.property?.locationText || ''), category: String((Array.isArray(data.categories) && data.categories[0]) || (Array.isArray(data.types) && data.types[0]) || (draft.property?.type ? mapTypeFromEnum(draft.property.type) : '') || (Array.isArray(data.purposes) && data.purposes[0]) || ''), status: normalizePropertyChangeStatus(draft.status) as PropertyDraftSummary['status'], modifiedOn: draft.modifiedOn.toISOString() };
    });
  } catch (error) {
    await logProblem(error, `getPropertyDrafts ${accountId}`);
    return [];
  }
}
