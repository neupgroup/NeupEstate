/*
::neup.documentation::bridge-shared-leads-collection
::api GET /bridge/api.v1/leads/shared
::public

Returns shared leads visible to the authenticated account. Supports limit and
offset pagination. Agency accounts and agency admins can view all records;
other accounts see leads assigned to them.

Example request:
```http
GET /bridge/api.v1/leads/shared?limit=10&offset=0
```

Example response:
```json
{
  "data": [
    {
      "id": "cm_sharedlead456",
      "baseLeadId": "cm_baselead123",
      "type": "BUYER",
      "requirements": { "purpose": "Sale", "location": "Kathmandu" },
      "priority": "MEDIUM",
      "owner": "account_123",
      "createdAt": "2026-10-27T08:15:00.000Z",
      "updatedAt": "2026-10-27T08:15:00.000Z",
      "client": {
        "id": "cm_baselead123",
        "belongsTo": "account_123",
        "firstName": "Asha",
        "lastName": "Sharma",
        "contact": { "email": "asha@example.com", "phone": "+9779800000000" },
        "contacts": [
          { "id": "cm_contact789", "clientId": "cm_baselead123", "type": "email", "value": "asha@example.com" },
          { "id": "cm_contact790", "clientId": "cm_baselead123", "type": "phone", "value": "+9779800000000" }
        ],
        "source": "website",
        "createdAt": "2026-10-27T08:00:00.000Z",
        "updatedAt": "2026-10-27T08:00:00.000Z"
      }
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
import { requireIdentity } from '@/services/listings/action-helpers';
import { getAccountById } from '@/services/accounts/id/get';
import { getAgencyAgentMapsByAgent } from '@/services/agencies/agent-maps/service';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';

export const dynamic = 'force-dynamic';

// Return the requested resource collection or item for a GET request.
export async function GET(request: NextRequest) {
  let stage = 'permission-check';
  try {
    await requirePermission(PERMISSIONS.crm.lead.view);

    stage = 'identity-resolution';
    const accountId = await requireIdentity();

    stage = 'account-and-agency-lookup';
    const [account, agencyLinks] = await Promise.all([
      getAccountById(accountId),
      getAgencyAgentMapsByAgent(accountId),
    ]);
    const canViewAll = ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(account?.account_type ?? '')
      || agencyLinks.some((link) => link.status === 'accepted' && link.isAdmin);
    const params = request.nextUrl.searchParams;
    const requestedLimit = Number(params.get('limit') ?? 10);
    const requestedOffset = Number(params.get('offset') ?? 0);
    // Cap shared-lead pages at 25 records.
    const limit = Number.isSafeInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 25) : 10;
    const offset = Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0;
    const where = canViewAll ? {} : { owner: accountId };

    stage = 'shared-leads-query';
    const [leads, total] = await Promise.all([
      prisma.leadsAssigned.findMany({
        where,
        include: { baseLead: { include: { contacts: true } } },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.leadsAssigned.count({ where }),
    ]);

    stage = 'response-mapping';
    const data = leads.map(({ baseLead, ...lead }) => {
      const legacy = baseLead.contact && typeof baseLead.contact === 'object'
        ? baseLead.contact as Record<string, unknown>
        : {};
      // Prefer the normalized contact value and fall back to the legacy value.
      const pick = (type: string, fallback: unknown) => baseLead.contacts.find((entry) => entry.type.toLowerCase() === type)?.value ?? fallback ?? null;
      return {
        ...lead,
        client: {
          ...baseLead,
          contact: { email: pick('email', legacy.email), phone: pick('phone', legacy.phone) },
        },
      };
    });

    return NextResponse.json({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } });
  } catch (error) {
    const unauthenticated = error instanceof Error && 'code' in error && error.code === 'UNAUTHENTICATED';
    const denied = error instanceof Error && error.message.startsWith('Permission denied:');
    const status = unauthenticated ? 401 : denied ? 403 : 500;
    return NextResponse.json({ success: false, error: status === 401 ? 'Authentication required.' : status === 403 ? 'Forbidden.' : 'Internal server error.' }, { status });
  }
}
