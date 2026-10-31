import { z } from 'zod';
import { prisma } from '@neup/core/database/prisma';
import { getAgencyAgentMapsByAgent } from '@/services/agencies/agent-maps/service';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { mcpError, mcpSuccess, type McpToolServer } from '../_shared';

/* Registers a tool that lists leads assigned to the actor's accepted agency teammates. */
export function registerViewMyTeamTool(server: McpToolServer, actorAccountId: string): void {
  server.registerTool('view_my_team_leads', {
    title: 'View my team leads', description: 'Lists leads assigned to agents in the authenticated account’s accepted agency teams.',
    inputSchema: { limit: z.number().int().min(1).max(25).default(10), offset: z.number().int().min(0).default(0) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset }) => {
    try {
      await requirePermission(PERMISSIONS.manage.selfLeadView);
      const links = await getAgencyAgentMapsByAgent(actorAccountId);
      const agencyIds = links.filter((link) => link.status === 'accepted').map((link) => link.agencyId);
      const members = agencyIds.length ? await prisma.agencyAgentMap.findMany({ where: { agencyId: { in: agencyIds }, status: 'accepted' }, select: { agentId: true } }) : [];
      const ownerIds = [...new Set([actorAccountId, ...members.map((member) => member.agentId)])];
      const where = { owner: { in: ownerIds } };
      const [data, total] = await Promise.all([
        prisma.sharedLeads.findMany({ where, include: { baseLead: { include: { contacts: true } } }, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
        prisma.sharedLeads.count({ where }),
      ]);
      return mcpSuccess({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } });
    } catch (error) { return mcpError(error, 'Failed to list team leads.'); }
  });
}
