import { z } from 'zod';
import { prisma } from '@neup/core/database/prisma';
import { getAccountById } from '@/services/accounts/id/get';
import { getAgencyAgentMapsByAgent, getAgencyAgentMapsByAgency } from '@/services/agencies/agent-maps/service';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { mcpError, mcpSuccess, type McpToolServer } from '../_shared';

/* Resolves agency accounts and accepted members for the authenticated actor. */
async function getOrganizationAccountIds(actorAccountId: string): Promise<string[]> {
  const account = await getAccountById(actorAccountId);
  const agencyTypes = ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'];
  const links = agencyTypes.includes(account?.account_type ?? '')
    ? await getAgencyAgentMapsByAgency(actorAccountId)
    : await getAgencyAgentMapsByAgent(actorAccountId);
  const agencyIds = agencyTypes.includes(account?.account_type ?? '')
    ? [actorAccountId]
    : links.filter((link) => link.status === 'accepted').map((link) => link.agencyId);
  const memberships = agencyIds.length
    ? await prisma.agencyAgentMap.findMany({ where: { agencyId: { in: agencyIds }, status: 'accepted' }, select: { agentId: true, agencyId: true } })
    : [];
  return [...new Set([actorAccountId, ...agencyIds, ...memberships.map((membership) => membership.agentId)])];
}

/* Registers a tool that lists shared leads created or assigned within the actor's organization. */
export function registerViewMyOrganizationTool(server: McpToolServer, actorAccountId: string): void {
  server.registerTool('view_my_organization_leads', {
    title: 'View my organization leads', description: 'Lists leads assigned to organization members or created from clients belonging to an organization member.',
    inputSchema: { limit: z.number().int().min(1).max(25).default(10), offset: z.number().int().min(0).default(0) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ limit, offset }) => {
    try {
      await requirePermission(PERMISSIONS.manage.selfLeadView);
      const accountIds = await getOrganizationAccountIds(actorAccountId);
      const where = { OR: [{ owner: { in: accountIds } }, { baseLead: { belongsTo: { in: accountIds } } }] };
      const [data, total] = await Promise.all([
        prisma.sharedLeads.findMany({ where, include: { baseLead: { include: { contacts: true } } }, orderBy: { createdAt: 'desc' }, skip: offset, take: limit }),
        prisma.sharedLeads.count({ where }),
      ]);
      return mcpSuccess({ data, pagination: { limit, offset, total, hasMore: offset + data.length < total } });
    } catch (error) { return mcpError(error, 'Failed to list organization leads.'); }
  });
}
