/*
::neup.documentation::bridge-base-lead-activity
::api GET /bridge/api.v1/leads/base/[id]/activity
::public

Returns the combined activity timeline from every shared lead belonging to a
visible base lead. Each activity includes its source shared lead. To create an
activity, use POST /bridge/api.v1/leads/[sharedLeadId]/activity.

Example request:
```http
GET /bridge/api.v1/leads/base/cm_baselead123/activity
```

Example response:
```json
{
  "data": [
    {
      "id": "cm_activity789",
      "leadId": "cm_sharedlead456",
      "data": {
        "activityType": "follow_up",
        "followUpMethod": "phone call",
        "propertyId": null,
        "propertyTitle": null,
        "remarks": "Called to discuss the buyer's requirements."
      },
      "activityOn": "2026-10-27T08:15:00.000Z",
      "activityBy": "Asha Sharma",
      "lead": {
        "id": "cm_sharedlead456",
        "type": "BUYER",
        "owner": "account_123"
      }
    }
  ]
}
```

::public end
::end
*/
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@neup/core/database/prisma';
import { logger } from '@neup/logica/logger';
import { requireIdentity } from '@/services/properties/action-helpers';
import { getAccountById } from '@/services/accounts/id/get';
import { getAgencyAgentMapsByAgent } from '@/services/agencies/agent-maps/service';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const endpoint = 'bridge/api.v1/leads/base/[id]/activity:GET';
  let stage = 'permission-check';
  let baseLeadId = '';

  try {
    await requirePermission(PERMISSIONS.manage.selfLeadView);
    stage = 'identity-resolution';
    const accountId = await requireIdentity();
    const { id } = await context.params;
    baseLeadId = id;

    stage = 'base-lead-visibility-check';
    const [baseLead, account, agencyLinks] = await Promise.all([
      prisma.baseLead.findUnique({
        where: { id },
        select: {
          id: true,
          belongsTo: true,
          sharedLeads: { select: { id: true, type: true, owner: true } },
        },
      }),
      getAccountById(accountId),
      getAgencyAgentMapsByAgent(accountId),
    ]);

    if (!baseLead) return NextResponse.json({ success: false, error: 'Base lead not found.' }, { status: 404 });
    const canViewAll = ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(account?.account_type ?? '')
      || agencyLinks.some((link) => link.status === 'accepted' && link.isAdmin);
    if (!canViewAll && baseLead.belongsTo !== accountId) {
      return NextResponse.json({ success: false, error: 'Base lead not found.' }, { status: 404 });
    }

    stage = 'activity-query';
    const sharedLeadIds = baseLead.sharedLeads.map((lead) => lead.id);
    const activities = sharedLeadIds.length
      ? await prisma.leadActivity.findMany({
          where: { leadId: { in: sharedLeadIds } },
          orderBy: { activityOn: 'desc' },
        })
      : [];
    const leadById = new Map(baseLead.sharedLeads.map((lead) => [lead.id, lead]));
    const data = activities.map((activity) => ({
      ...activity,
      lead: leadById.get(activity.leadId) ?? null,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    const unauthenticated = error instanceof Error && 'code' in error && error.code === 'UNAUTHENTICATED';
    const denied = error instanceof Error && error.message.startsWith('Permission denied:');
    const details = error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack, cause: error.cause }
      : { value: String(error) };
    const status = unauthenticated ? 401 : denied ? 403 : 500;
    try {
      await logger().type(endpoint).data({ endpoint: '/bridge/api.v1/leads/base/[id]/activity', stage, baseLeadId, error: details }).error();
    } catch (loggingError) {
      console.error(`[${endpoint}] Logica error reporting failed`, loggingError);
      console.error(`[${endpoint}] Request failed`, { stage, baseLeadId, error: details });
    }
    return NextResponse.json({ success: false, error: status === 401 ? 'Authentication required.' : status === 403 ? 'Forbidden.' : 'Internal server error.' }, { status });
  }
}
