import { z } from 'zod';
import { prisma } from '@neup/core/database/prisma';
import { createVisitRequest } from '@/services/properties/single/engage/visit';
import { CreateVisitRequestSchema } from '@/types/property';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { mcpError, mcpSuccess, type McpToolServer } from '../_shared';

/* Registers visit request submission and account-scoped request listing tools. */
export function registerVisitRequestTools(server: McpToolServer, actorAccountId: string): void {
  server.registerTool('create_visit_request', {
    title: 'Request a property visit',
    description: 'Submits a visit request for an approved property. Provide contact information and a preferred date; the property’s listing agent is resolved by the existing service.',
    inputSchema: {
      propertyId: CreateVisitRequestSchema.shape.propertyId.describe('ID of the property to visit.'),
      name: CreateVisitRequestSchema.shape.name,
      email: CreateVisitRequestSchema.shape.email,
      phone: CreateVisitRequestSchema.shape.phone,
      preferred_date: CreateVisitRequestSchema.shape.preferred_date.describe('Preferred visit date in YYYY-MM-DD format.'),
      preferred_time: CreateVisitRequestSchema.shape.preferred_time.describe('Optional preferred local time in HH:mm format.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (input) => {
    try {
      await requirePermission(PERMISSIONS.public.propertyInquire);
      const parsed = CreateVisitRequestSchema.safeParse({ ...input, submittedBy: actorAccountId });
      if (!parsed.success) {
        return mcpError(JSON.stringify({ error: 'Invalid visit request.', details: parsed.error.flatten().fieldErrors }));
      }
      const requestId = await createVisitRequest(parsed.data);
      return mcpSuccess({ success: true, requestId, status: 'new' });
    } catch (error) { return mcpError(error, 'Failed to submit visit request.'); }
  });

  server.registerTool('list_my_visit_requests', {
    title: 'List my visit requests',
    description: 'Lists visit requests assigned to the authenticated account as listing agent, newest first. Contact details are limited to requests for that account’s properties.',
    inputSchema: {
      limit: z.number().int().min(1).max(100).default(25),
      offset: z.number().int().min(0).default(0),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset }) => {
    try {
      await requirePermission(PERMISSIONS.manage.propertySelfView);
      const where = { agentId: actorAccountId };
      const [requests, total] = await Promise.all([
        prisma.visitRequest.findMany({ where, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
        prisma.visitRequest.count({ where }),
      ]);
      const data = requests.map(({ preferredDate, preferredTime, createdAt, ...request }) => ({
        ...request,
        preferred_date: preferredDate,
        preferred_time: preferredTime ?? undefined,
        createdAt: createdAt.toISOString(),
      }));
      return mcpSuccess({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } });
    } catch (error) { return mcpError(error, 'Failed to list visit requests.'); }
  });
}
