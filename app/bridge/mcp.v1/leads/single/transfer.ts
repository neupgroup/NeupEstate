import { z } from 'zod';
import { prisma } from '@neup/core/database/prisma';
import { getAccountById } from '@/services/accounts/id/get';
import { getAgencyAgentMapsByAgent } from '@/services/agencies/agent-maps/service';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { mcpError, mcpSuccess, type McpToolServer } from '../../_shared';

/* Finds accepted agents in any organization shared by the actor. */
async function getAcceptedOrganizationMembers(actorAccountId: string): Promise<{ accountIds: string[]; canManage: boolean }> {
  const [actor, actorLinks] = await Promise.all([getAccountById(actorAccountId), getAgencyAgentMapsByAgent(actorAccountId)]);
  const agencyAccount = ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(actor?.account_type ?? '');
  const agencyIds = agencyAccount
    ? [actorAccountId]
    : actorLinks.filter((link) => link.status === 'accepted').map((link) => link.agencyId);
  const memberships = agencyIds.length ? await prisma.agencyAgentMap.findMany({ where: { agencyId: { in: agencyIds }, status: 'accepted' }, select: { agentId: true, isAdmin: true } }) : [];
  const canManage = agencyAccount || actorLinks.some((link) => link.status === 'accepted' && link.isAdmin);
  return { accountIds: [...new Set([actorAccountId, ...agencyIds, ...memberships.map((membership) => membership.agentId)])], canManage };
}

/* Registers a tool that transfers a lead to an accepted member of the actor's organization. */
export function registerTransferLeadTool(server: McpToolServer, actorAccountId: string): void {
  server.registerTool('transfer_shared_lead', {
    title: 'Transfer shared lead', description: 'Transfers a lead owned by the authenticated account to an accepted member of its organization. Organization administrators can transfer organization leads.',
    inputSchema: { leadId: z.string().trim().min(1), targetAccountId: z.string().trim().min(1) },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ leadId, targetAccountId }) => {
    try {
      await requirePermission(PERMISSIONS.manage.selfLeadCreate);
      const { accountIds, canManage } = await getAcceptedOrganizationMembers(actorAccountId);
      const lead = await prisma.sharedLeads.findUnique({ where: { id: leadId }, select: { id: true, owner: true } });
      if (!lead || !accountIds.includes(lead.owner) || (!canManage && lead.owner !== actorAccountId)) return mcpError('Lead not found or not transferable by this account.');
      if (!accountIds.includes(targetAccountId)) return mcpError('Target account is not an accepted member of your organization.');
      const updated = await prisma.sharedLeads.update({ where: { id: leadId }, data: { owner: targetAccountId } });
      return mcpSuccess({ success: true, data: updated });
    } catch (error) { return mcpError(error, 'Failed to transfer lead.'); }
  });
}
