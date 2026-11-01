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
    description: 'Submits a visit request for an approved property. Provide contact information and a preferred date; normalize other natural language dates to YYYY-MM-DD before calling. Accepted lowercase date tokens are today, tomorrow, in3days, 12amtoday, 12pmtoday, inXdays (X is a non-negative integer), in3hours, and in30minutes. For 12amtoday or 12pmtoday, use 00:00 or 12:00 as preferred_time. The property’s listing agent is resolved by the existing service.',
    inputSchema: {
      propertyId: CreateVisitRequestSchema.shape.propertyId.describe('ID of the property to visit.'),
      name: CreateVisitRequestSchema.shape.name,
      email: CreateVisitRequestSchema.shape.email,
      phone: CreateVisitRequestSchema.shape.phone,
      preferred_date: z.string().trim().min(1).describe('Required visit date as YYYY-MM-DD or one of the accepted lowercase date tokens described above. Normalize other natural language dates to YYYY-MM-DD.'),
      preferred_time: CreateVisitRequestSchema.shape.preferred_time.describe('Optional preferred local time in HH:mm format; use 00:00 for 12amtoday and 12:00 for 12pmtoday.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (input) => {
    try {
      await requirePermission(PERMISSIONS.public.propertyInquire);
      const preferredDate = normalizeVisitDate(input.preferred_date);
      const preferredTime = input.preferred_time ?? getVisitTimeFromToken(input.preferred_date);
      const parsed = CreateVisitRequestSchema.safeParse({ ...input, preferred_date: preferredDate, preferred_time: preferredTime, submittedBy: actorAccountId });
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

/* Converts supported date tokens into the calendar-date format expected by the visit service. */
function normalizeVisitDate(value: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const date = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    if (date.getFullYear() !== Number(dateOnly[1]) || date.getMonth() !== Number(dateOnly[2]) - 1 || date.getDate() !== Number(dateOnly[3])) {
      throw new Error('preferred_date must be a valid YYYY-MM-DD date or supported lowercase token.');
    }
    return value;
  }

  const date = new Date();
  if (value === 'tomorrow') date.setDate(date.getDate() + 1);
  else if (value === 'in3days') date.setDate(date.getDate() + 3);
  else if (/^in\d+days$/.test(value)) date.setDate(date.getDate() + Number(value.slice(2, -4)));
  else if (value !== 'today' && value !== '12amtoday' && value !== '12pmtoday' && value !== 'in3hours' && value !== 'in30minutes') {
    throw new Error('preferred_date must be a YYYY-MM-DD date or supported lowercase token.');
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/* Extracts a time when the accepted visit date token includes one. */
function getVisitTimeFromToken(value: string): string | undefined {
  if (value === '12amtoday') return '00:00';
  if (value === '12pmtoday') return '12:00';
  return undefined;
}
