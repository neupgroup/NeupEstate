import { z } from 'zod';
import { prisma } from '@neup/core/database/prisma';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { mcpError, mcpSuccess, type McpToolServer } from '../_shared';

/* Registers a tool that lists leads assigned to the authenticated account. */
export function registerViewMineTool(server: McpToolServer, actorAccountId: string): void {
  server.registerTool('view_my_leads', {
    title: 'View my leads', description: 'Lists shared leads assigned to the authenticated account.',
    inputSchema: { limit: z.number().int().min(1).max(25).default(10), offset: z.number().int().min(0).default(0) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset }) => {
    try {
      await requirePermission(PERMISSIONS.manage.selfLeadView);
      const where = { owner: actorAccountId };
      const [data, total] = await Promise.all([
        prisma.sharedLeads.findMany({ where, include: { baseLead: { include: { contacts: true } } }, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
        prisma.sharedLeads.count({ where }),
      ]);
      return mcpSuccess({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } });
    } catch (error) { return mcpError(error, 'Failed to list your leads.'); }
  });
}
