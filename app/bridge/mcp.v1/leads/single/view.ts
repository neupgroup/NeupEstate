import { z } from 'zod';
import { getLeadById } from '@/services/leads/search';
import { getVisibleLead } from '@neup/logica/estate/lead/activity';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { mcpError, mcpSuccess, type McpToolServer } from '../../_shared';

const responseFormats = {
  nia: '```nia.estate.leads.viewLead\n{payload}\n```',
  chatgpt: '{payload}',
};

/* Registers a tool that returns one lead visible to the authenticated account. */
export function registerViewLeadTool(server: McpToolServer, actorAccountId: string, format?: string): void {
  server.registerTool('view_shared_lead', {
    title: 'View shared lead',
    description: 'Returns one shared lead visible to the authenticated account.',
    inputSchema: { leadId: z.string().trim().min(1) },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ leadId }) => {
    try {
      await requirePermission(PERMISSIONS.crm.lead.view);
      if (!await getVisibleLead(leadId, actorAccountId)) return mcpError('Lead not found or not visible to this account.');
      const lead = await getLeadById(leadId);
      if (!lead) return mcpError('Lead not found or not visible to this account.');
      return mcpSuccess({ data: lead }, format, responseFormats);
    } catch (error) {
      return mcpError(error, 'Failed to view lead.');
    }
  });
}
