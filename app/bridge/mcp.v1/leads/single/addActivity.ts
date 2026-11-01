import { z } from 'zod';
import { addLeadActivity, getVisibleLead, type FollowUpMethod } from '@neup/logica/estate/lead/activity';
import { requirePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';
import { mcpError, mcpSuccess, type McpToolServer } from '../../_shared';

const responseFormats = {
  nia: '```nia.estate.leads.addActivity\n{payload}\n```',
  chatgpt: '{payload}',
};

const activityPayloadSchema = z.object({
  activityType: z.enum(['follow_up', 'visit', 'meeting', 'remarks']),
  activityOn: z.string().trim().min(1).optional().describe(
    'Date/time for the activity. Accepts ISO datetime, YYYY-MM-DD (interpreted as 12:00 UTC), or exactly today, tomorrow, in3days, 12amtoday, 12pmtoday, inXdays, in3hours, or in30minutes (lowercase; X is a non-negative integer). For other natural language dates, normalize to an ISO datetime before calling this tool.',
  ),
  followUpMethod: z.enum(['phone call', 'whatsapp', 'email']).optional(),
  propertyId: z.string().trim().min(1).optional(),
  remarks: z.string().trim().min(1),
}).superRefine((activity, context) => {
  if (activity.activityType === 'follow_up' && !activity.followUpMethod) {
    context.addIssue({ code: 'custom', path: ['followUpMethod'], message: 'Required for follow_up activities.' });
  }
});

/* Registers a tool that adds an activity payload to a visible shared lead. */
export function registerAddActivityTool(server: McpToolServer, actorAccountId: string, format?: string): void {
  server.registerTool('add_shared_lead_activity', {
    title: 'Add lead activity', description: 'Adds an activity to a shared lead the authenticated account can access. Normalize natural language dates to ISO datetime before calling. A date-only value means noon UTC. Accepted date tokens: today, tomorrow, in3days, 12amtoday, 12pmtoday, inXdays (X is a non-negative integer), in3hours, and in30minutes; tokens must be lowercase. For a follow up, set activityType to follow_up and provide followUpMethod.',
    inputSchema: { leadId: z.string().trim().min(1), activity: activityPayloadSchema },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ leadId, activity }) => {
    try {
      await requirePermission(PERMISSIONS.manage.selfLeadAddActivity);
      if (!await getVisibleLead(leadId, actorAccountId)) return mcpError('Lead not found or not visible to this account.');
      const data = await addLeadActivity({
        leadId, accountId: actorAccountId, activityType: activity.activityType,
        activityOn: activity.activityOn ? normalizeActivityDateTime(activity.activityOn) : undefined,
        followUpMethod: activity.followUpMethod as FollowUpMethod | undefined,
        propertyId: activity.propertyId, remarks: activity.remarks,
      });
      const selectedFormats = activity.activityType === 'follow_up'
        ? { ...responseFormats, nia: '```nia.estate.leads.addFollowup\n{payload}\n```' }
        : responseFormats;
      return mcpSuccess({ data }, format, selectedFormats);
    } catch (error) { return mcpError(error, 'Failed to add lead activity.'); }
  });
}

/* Converts supported date tokens and date-only values to ISO timestamps. */
function normalizeActivityDateTime(value: string): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const date = new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12));
    if (date.getUTCFullYear() !== Number(dateOnly[1]) || date.getUTCMonth() !== Number(dateOnly[2]) - 1 || date.getUTCDate() !== Number(dateOnly[3])) {
      throw new Error('activityOn must be a valid date or supported date token.');
    }
    return date.toISOString();
  }

  const now = new Date();
  const result = new Date(now);
  const dayOffset = value === 'tomorrow' ? 1 : value === 'in3days' ? 3 : /^in\d+days$/.test(value) ? Number(value.slice(2, -4)) : 0;

  if (value === 'today' || value === 'tomorrow' || value === 'in3days' || /^in\d+days$/.test(value)) {
    result.setUTCDate(result.getUTCDate() + dayOffset);
    result.setUTCHours(12, 0, 0, 0);
    return result.toISOString();
  }
  if (value === '12amtoday' || value === '12pmtoday') {
    result.setUTCHours(value === '12amtoday' ? 0 : 12, 0, 0, 0);
    return result.toISOString();
  }
  if (value === 'in3hours') {
    result.setUTCHours(result.getUTCHours() + 3);
    return result.toISOString();
  }
  if (value === 'in30minutes') {
    result.setUTCMinutes(result.getUTCMinutes() + 30);
    return result.toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('activityOn must be a valid date or supported date token.');
  return parsed.toISOString();
}
