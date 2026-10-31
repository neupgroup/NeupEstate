import { z } from 'zod';
import { prisma } from '@neup/core/database/prisma';
import { createLead } from '@/services/leads/create';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { mcpError, mcpSuccess, type McpToolServer } from '../_shared';

/* Registers a tool that creates a shared lead owned by the authenticated account. */
export function registerAddLeadTool(server: McpToolServer, actorAccountId: string): void {
  server.registerTool('add_lead', {
    title: 'Add lead', description: 'Creates a shared lead for the authenticated account, either for an existing client owned by the account or a new client.',
    inputSchema: {
      existingClientId: z.string().trim().min(1).optional(),
      firstName: z.string().trim().min(1).optional(), lastName: z.string().trim().min(1).optional(),
      email: z.string().email().optional(), phone: z.string().trim().optional(), source: z.string().trim().optional(),
      type: z.enum(['BUYER', 'SELLER', 'TENANT', 'LANDLORD']),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      requirement: z.record(z.unknown()).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (input) => {
    try {
      await requirePermission(PERMISSIONS.manage.selfLeadCreate);
      if (input.existingClientId) {
        const client = await prisma.baseLead.findFirst({ where: { id: input.existingClientId, belongsTo: actorAccountId }, select: { id: true } });
        if (!client) return mcpError('Client not found or not owned by this account.');
      } else if (!input.firstName || !input.lastName) {
        return mcpError('firstName and lastName are required when creating a new client.');
      }
      const leadId = await createLead({ ...input, belongsTo: actorAccountId, assignedTo: actorAccountId });
      return mcpSuccess({ success: true, leadId });
    } catch (error) { return mcpError(error, 'Failed to create lead.'); }
  });
}
