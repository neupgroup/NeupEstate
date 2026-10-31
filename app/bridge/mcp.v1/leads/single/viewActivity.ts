import { z } from 'zod';
import { getLeadActivities, getVisibleLead } from '@neup/logica/estate/lead/activity';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { mcpError, mcpSuccess, type McpToolServer } from '../../_shared';

/* Registers a tool that returns a visible lead's activity timeline. */
export function registerViewActivityTool(server: McpToolServer, actorAccountId: string): void {
  server.registerTool('view_shared_lead_activity', {
    title: 'View lead activity', description: 'Returns the activity timeline for a shared lead visible to the authenticated account, newest first.',
    inputSchema: { leadId: z.string().trim().min(1) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ leadId }) => {
    try {
      await requirePermission(PERMISSIONS.manage.selfLeadView);
      if (!await getVisibleLead(leadId, actorAccountId)) return mcpError('Lead not found or not visible to this account.');
      return mcpSuccess({ leadId, data: await getLeadActivities(leadId) });
    } catch (error) { return mcpError(error, 'Failed to view lead activity.'); }
  });
}
