/*
::neup.documentation::bridge-lead-activity
::api GET, POST /bridge/api.v1/leads/[id]/activity
::public

GET returns the activity timeline for a visible shared lead. POST adds an
activity to a visible shared lead. Both operations derive the acting account
from authentication; POST does not accept activityBy from the request body.

GET example request:
```http
GET /bridge/api.v1/leads/cm_sharedlead456/activity
```

GET example response:
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
      "activityBy": "Asha Sharma"
    }
  ]
}
```

POST example request:
```http
POST /bridge/api.v1/leads/cm_sharedlead456/activity
Content-Type: application/json

{
  "activityType": "follow_up",
  "activityOn": "2026-10-27T08:15:00.000Z",
  "followUpMethod": "phone call",
  "remarks": "Called to discuss the buyer's requirements."
}
```

Supported activityType values are follow_up, visit, meeting, and remarks.
follow_up requires followUpMethod (phone call, whatsapp, or email). All types
require non-empty remarks. Non-remarks activities require activityOn. A visit
may include propertyId.

POST example response:
```json
{
  "success": true,
  "data": {
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
    "activityBy": "Asha Sharma"
  }
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
import { createLeadActivity, type LeadActivityType } from '@/services/leads/activity/create';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };
type FollowUpMethod = 'phone call' | 'whatsapp' | 'email';

const activityTypes: LeadActivityType[] = ['follow_up', 'visit', 'meeting', 'remarks'];
const followUpMethods: FollowUpMethod[] = ['phone call', 'whatsapp', 'email'];

async function getVisibleLead(leadId: string, accountId: string) {
  const [lead, account, agencyLinks] = await Promise.all([
    prisma.sharedLeads.findUnique({ where: { id: leadId }, select: { id: true, owner: true } }),
    getAccountById(accountId),
    getAgencyAgentMapsByAgent(accountId),
  ]);
  if (!lead) return null;

  const canViewAll = ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(account?.account_type ?? '')
    || agencyLinks.some((link) => link.status === 'accepted' && link.isAdmin);
  return canViewAll || lead.owner === accountId ? lead : null;
}

function errorResponse(error: unknown) {
  const unauthenticated = error instanceof Error && 'code' in error && error.code === 'UNAUTHENTICATED';
  const denied = error instanceof Error && error.message.startsWith('Permission denied:');
  const details = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack, cause: error.cause }
    : { value: String(error) };
  const status = unauthenticated ? 401 : denied ? 403 : 500;

  return { details, response: NextResponse.json({ success: false, error: status === 401 ? 'Authentication required.' : status === 403 ? 'Forbidden.' : 'Internal server error.' }, { status }) };
}

async function logRouteError(endpoint: string, error: unknown, details: Record<string, unknown>) {
  try {
    await logger().type(endpoint).data({ ...details, error }).error();
  } catch (loggingError) {
    console.error(`[${endpoint}] Logica error reporting failed`, loggingError);
    console.error(`[${endpoint}] Request failed`, { ...details, error });
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const endpoint = 'bridge/api.v1/leads/[id]/activity:GET';
  let stage = 'permission-check';
  let leadId = '';
  try {
    await requirePermission(PERMISSIONS.manage.selfLeadView);
    stage = 'identity-resolution';
    const accountId = await requireIdentity();
    const { id } = await context.params;
    leadId = id;
    stage = 'lead-visibility-check';
    const lead = await getVisibleLead(id, accountId);
    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });

    stage = 'activity-query';
    const data = await prisma.leadActivity.findMany({
      where: { leadId: id },
      orderBy: { activityOn: 'desc' },
    });
    return NextResponse.json({ data });
  } catch (error) {
    const failure = errorResponse(error);
    await logRouteError(endpoint, failure.details, { stage, leadId });
    return failure.response;
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const endpoint = 'bridge/api.v1/leads/[id]/activity:POST';
  let stage = 'permission-check';
  let leadId = '';
  try {
    await requirePermission(PERMISSIONS.manage.selfLeadAddActivity);
    stage = 'identity-resolution';
    const accountId = await requireIdentity();
    const { id } = await context.params;
    leadId = id;
    stage = 'lead-visibility-check';
    const lead = await getVisibleLead(id, accountId);
    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found.' }, { status: 404 });

    stage = 'request-validation';
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'A JSON object is required.' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const activityType = input.activityType;
    const activityOn = input.activityOn;
    const followUpMethod = input.followUpMethod;
    const propertyId = input.propertyId;
    const remarks = input.remarks;

    if (typeof activityType !== 'string' || !activityTypes.includes(activityType as LeadActivityType)) {
      return NextResponse.json({ success: false, error: 'activityType must be follow_up, visit, meeting, or remarks.' }, { status: 400 });
    }
    if (typeof remarks !== 'string' || !remarks.trim()) {
      return NextResponse.json({ success: false, error: 'remarks is required.' }, { status: 400 });
    }
    if (activityOn !== undefined && (typeof activityOn !== 'string' || !activityOn.trim() || Number.isNaN(Date.parse(activityOn)))) {
      return NextResponse.json({ success: false, error: 'activityOn must be a valid date when provided.' }, { status: 400 });
    }
    if (activityType !== 'remarks' && activityOn === undefined) {
      return NextResponse.json({ success: false, error: 'A valid activityOn date is required for this activityType.' }, { status: 400 });
    }
    if (activityType === 'follow_up' && (typeof followUpMethod !== 'string' || !followUpMethods.includes(followUpMethod as FollowUpMethod))) {
      return NextResponse.json({ success: false, error: 'followUpMethod must be phone call, whatsapp, or email for follow_up activities.' }, { status: 400 });
    }
    if (propertyId !== undefined && (typeof propertyId !== 'string' || !propertyId.trim())) {
      return NextResponse.json({ success: false, error: 'propertyId must be a non-empty string when provided.' }, { status: 400 });
    }

    stage = 'activity-creation';
    const account = await prisma.account.findUnique({ where: { id: accountId }, select: { displayName: true } });
    const activityId = await createLeadActivity({
      leadId: id,
      activityType: activityType as LeadActivityType,
      activityOn: typeof activityOn === 'string' ? activityOn : undefined,
      followUpMethod: typeof followUpMethod === 'string' ? followUpMethod as FollowUpMethod : undefined,
      propertyId: typeof propertyId === 'string' ? propertyId : undefined,
      remarks,
      activityBy: account?.displayName?.trim() || accountId,
    });

    const data = await prisma.leadActivity.findUnique({ where: { id: activityId } });
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    const failure = errorResponse(error);
    await logRouteError(endpoint, failure.details, { stage, leadId });
    return failure.response;
  }
}
