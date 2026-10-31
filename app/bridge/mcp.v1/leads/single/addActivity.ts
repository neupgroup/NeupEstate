import { z } from 'zod';
import { addLeadActivity, getVisibleLead, type FollowUpMethod } from '@neup/logica/estate/lead/activity';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { mcpError, mcpSuccess, type McpToolServer } from '../../_shared';

const activityPayloadSchema = z.object({
  activityType: z.enum(['follow_up', 'visit', 'meeting', 'remarks']),
  activityOn: z.string().datetime().optional(),
  followUpMethod: z.enum(['phone call', 'whatsapp', 'email']).optional(),
  propertyId: z.string().trim().min(1).optional(),
  remarks: z.string().trim().min(1),
}).superRefine((activity, context) => {
  if (activity.activityType === 'follow_up' && !activity.followUpMethod) {
    context.addIssue({ code: 'custom', path: ['followUpMethod'], message: 'Required for follow_up activities.' });
  }
});

/* Registers a tool that adds an activity payload to a visible shared lead. */
export function registerAddActivityTool(server: McpToolServer, actorAccountId: string): void {
  server.registerTool('add_shared_lead_activity', {
    title: 'Add lead activity', description: 'Adds an activity to a shared lead the authenticated account can access. For a follow up, set activityType to follow_up and provide followUpMethod.',
    inputSchema: { leadId: z.string().trim().min(1), activity: activityPayloadSchema },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ leadId, activity }) => {
    try {
      await requirePermission(PERMISSIONS.manage.selfLeadAddActivity);
      if (!await getVisibleLead(leadId, actorAccountId)) return mcpError('Lead not found or not visible to this account.');
      const data = await addLeadActivity({
        leadId, accountId: actorAccountId, activityType: activity.activityType,
        activityOn: activity.activityOn, followUpMethod: activity.followUpMethod as FollowUpMethod | undefined,
        propertyId: activity.propertyId, remarks: activity.remarks,
      });
      return mcpSuccess({ data });
    } catch (error) { return mcpError(error, 'Failed to add lead activity.'); }
  });
}
