import { z } from 'zod';
import { prisma } from '@neup/core/database/prisma';
import { getPropertiesSaved } from '@/services/properties/list';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { mcpError, mcpSuccess, type McpToolServer } from '../_shared';

/* Registers a tool for listing saved active properties belonging to the actor. */
export function registerSavedPropertiesTool(server: McpToolServer, actorAccountId: string): void {
  server.registerTool('list_my_saved_properties', {
    title: 'List my saved properties', description: 'Lists active properties saved by the authenticated account, newest saved first.',
    inputSchema: { limit: z.number().int().min(1).max(100).default(25), offset: z.number().int().min(0).default(0) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset }) => {
    try {
      await requirePermission(PERMISSIONS.public.propertySave);
      const [data, total] = await Promise.all([
        getPropertiesSaved(actorAccountId, offset, limit),
        prisma.savedProperty.count({ where: { accountId: actorAccountId } }),
      ]);
      return mcpSuccess({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } });
    } catch (error) { return mcpError(error, 'Failed to list saved properties.'); }
  });
}
