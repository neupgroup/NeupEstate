import { prisma } from '@neup/core/database/prisma';

export type LeadActivityType = 'follow_up' | 'visit' | 'meeting' | 'remarks';
export type FollowUpMethod = 'phone call' | 'whatsapp' | 'email';

export interface AddLeadActivityInput {
  leadId: string;
  accountId: string;
  activityType: LeadActivityType;
  activityOn?: string;
  followUpMethod?: FollowUpMethod;
  propertyId?: string;
  remarks: string;
}

/** Checks whether an account can access a shared lead's activity timeline. */
export async function getVisibleLead(leadId: string, accountId: string) {
  const [lead, account, agencyLinks] = await Promise.all([
    prisma.sharedLeads.findUnique({ where: { id: leadId }, select: { id: true, owner: true } }),
    prisma.account.findUnique({ where: { id: accountId }, select: { accountType: true } }),
    prisma.agencyAgentMap.findMany({
      where: { agentId: accountId },
      select: { status: true, isAdmin: true },
    }),
  ]);
  if (!lead) return null;

  const canViewAll = ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(account?.accountType ?? '')
    || agencyLinks.some((link) => link.status === 'accepted' && link.isAdmin);
  return canViewAll || lead.owner === accountId ? lead : null;
}

/** Returns a shared lead's activity timeline, newest activity first. */
export async function getLeadActivities(leadId: string) {
  return prisma.leadActivity.findMany({
    where: { leadId },
    orderBy: { activityOn: 'desc' },
  });
}

/** Adds a validated activity to a shared lead and returns the created record. */
export async function addLeadActivity(input: AddLeadActivityInput) {
  const [account, property] = await Promise.all([
    prisma.account.findUnique({ where: { id: input.accountId }, select: { displayName: true } }),
    input.propertyId
      ? prisma.listing.findUnique({ where: { id: input.propertyId }, select: { title: true } })
      : Promise.resolve(null),
  ]);

  return prisma.leadActivity.create({
    data: {
      leadId: input.leadId,
      activityBy: account?.displayName?.trim() || input.accountId,
      activityOn: input.activityOn ? new Date(input.activityOn) : new Date(),
      data: {
        activityType: input.activityType,
        followUpMethod: input.followUpMethod ?? null,
        propertyId: input.propertyId ?? null,
        propertyTitle: property?.title ?? null,
        remarks: input.remarks.trim(),
      },
    },
  });
}
