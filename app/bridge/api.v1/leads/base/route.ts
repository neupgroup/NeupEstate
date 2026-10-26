/*
::neup.documentation::bridge-base-leads-collection
::api GET /bridge/api.v1/leads/base
::public

Returns base lead/client records visible to the authenticated account. Supports
limit and offset pagination. Agency accounts and agency admins can view all
records; other accounts see records they own.

Example request:
```http
GET /bridge/api.v1/leads/base?limit=10&offset=0
```

Example response:
```json
{
  "data": [
    {
      "id": "cm_baselead123",
      "belongsTo": "account_123",
      "firstName": "Asha",
      "lastName": "Sharma",
      "contact": { "email": "asha@example.com", "phone": "+9779800000000" },
      "source": "website",
      "createdAt": "2026-10-27T08:15:00.000Z",
      "updatedAt": "2026-10-27T08:15:00.000Z",
      "leads": [
        {
          "id": "cm_sharedlead456",
          "baseLeadId": "cm_baselead123",
          "type": "BUYER",
          "requirements": { "purpose": "Sale", "location": "Kathmandu" },
          "priority": "MEDIUM",
          "owner": "account_123",
          "createdAt": "2026-10-27T08:15:00.000Z",
          "updatedAt": "2026-10-27T08:15:00.000Z"
        }
      ]
    }
  ],
  "pagination": { "limit": 10, "offset": 0, "total": 1, "hasMore": false }
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

function getPagination(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const requestedLimit = Number(params.get('limit') ?? 10);
  const requestedOffset = Number(params.get('offset') ?? 0);
  return {
    limit: Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 25) : 10,
    offset: Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.manage.selfLeadView);
    const accountId = await requireIdentity();
    const [account, agencyLinks] = await Promise.all([
      getAccountById(accountId),
      getAgencyAgentMapsByAgent(accountId),
    ]);
    const canViewAll = ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(account?.account_type ?? '')
      || agencyLinks.some((link) => link.status === 'accepted' && link.isAdmin);
    const { limit, offset } = getPagination(request);
    const where = canViewAll ? {} : { belongsTo: accountId };
    const [records, total] = await Promise.all([
      prisma.baseLead.findMany({
        where,
        include: {
          contacts: true,
          sharedLeads: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.baseLead.count({ where }),
    ]);

    const data = records.map(({ contacts, sharedLeads, contact, ...lead }) => {
      const legacy = contact && typeof contact === 'object' ? contact as Record<string, unknown> : {};
      const pick = (type: string, fallback: unknown) => contacts.find((entry) => entry.type.toLowerCase() === type)?.value ?? fallback ?? null;
      return {
        ...lead,
        contact: { email: pick('email', legacy.email), phone: pick('phone', legacy.phone) },
        leads: sharedLeads,
      };
    });

    return NextResponse.json({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } });
  } catch (error) {
    const unauthenticated = error instanceof Error && 'code' in error && error.code === 'UNAUTHENTICATED';
    const denied = error instanceof Error && error.message.startsWith('Permission denied:');
    await logger().type('bridge/api.v1/leads/base:GET').data({ error: String(error), details: {} }).log();
    const status = unauthenticated ? 401 : denied ? 403 : 500;
    return NextResponse.json({ success: false, error: status === 401 ? 'Authentication required.' : status === 403 ? 'Forbidden.' : 'Internal server error.' }, { status });
  }
}
