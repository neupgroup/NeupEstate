'use server';

import { Prisma } from '@/core/database/prisma';
import { prisma } from '@/core/database/prisma';
import type {
  AnalyticsDailyPoint,
  AnalyticsDashboardData,
  AnalyticsLevel,
  AnalyticsLevelSummary,
  AnalyticsMetricTotals,
  AnalyticsScopeSummary,
  AnalyticsSourceScope,
} from '@/core/analytics/types';
import { getAuthenticatedAccount } from '@/services/auth';
import { getAgencyMapByAccount, getAgencyMapsByAgency } from '@/services/agency-customization-service';
import { hasPermission, PERMISSIONS } from '@/services/permissions';

const ANALYTICS_DAYS = 30;

const SOURCE_LABELS: Record<AnalyticsSourceScope, { label: string; description: string }> = {
  'site.neup.estate': {
    label: 'site(neup.estate)',
    description: 'Native public website reach, property engagement, leads, and inquiries.',
  },
  'app.neup.estate': {
    label: 'app(neup.estate)',
    description: 'Native app/manage activity, CRM leads, and owned listing workflow data.',
  },
  'site.custom.via.api': {
    label: 'site(custom.via.api)',
    description: 'Bridge API traffic and public-site API records for custom websites.',
  },
  'app.custom.via.api': {
    label: 'app(custom.via.api)',
    description: 'Bridge API traffic and app-side API records for custom applications.',
  },
};

type AccountContext = {
  level: AnalyticsLevel;
  label: string;
  contextLabel: string;
  accountIds?: string[];
  propertyIds?: string[];
};

type ActivityRow = {
  accountId: string;
  title: string;
  details: Prisma.JsonValue;
  activityOn: Date;
};

type SearchParams = Record<string, string | string[] | undefined>;

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getPeriod() {
  const today = startOfDay(new Date());
  const from = addDays(today, -(ANALYTICS_DAYS - 1));
  const to = addDays(today, 1);

  return { from, to };
}

function makeEmptyTotals(): AnalyticsMetricTotals {
  return { reach: 0, interactions: 0, leads: 0, inquiries: 0 };
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function makeDailyData(from: Date): AnalyticsDailyPoint[] {
  return Array.from({ length: ANALYTICS_DAYS }, (_, index) => {
    const date = addDays(from, index);
    return {
      date: formatDisplayDate(date),
      Reach: 0,
      Interactions: 0,
      Leads: 0,
      Inquiries: 0,
    };
  });
}

function addDailyValue(
  dailyData: AnalyticsDailyPoint[],
  from: Date,
  date: Date,
  metric: keyof Omit<AnalyticsDailyPoint, 'date'>,
  value = 1,
) {
  const index = Math.floor((startOfDay(date).getTime() - from.getTime()) / 86_400_000);
  if (index < 0 || index >= dailyData.length) return;
  dailyData[index][metric] += value;
}

function sumTotals(summaries: AnalyticsScopeSummary[]): AnalyticsMetricTotals {
  return summaries.reduce((totals, summary) => ({
    reach: totals.reach + summary.totals.reach,
    interactions: totals.interactions + summary.totals.interactions,
    leads: totals.leads + summary.totals.leads,
    inquiries: totals.inquiries + summary.totals.inquiries,
  }), makeEmptyTotals());
}

function getStringFromJsonObject(value: Prisma.JsonValue, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, Prisma.JsonValue>;
  return typeof record[key] === 'string' ? record[key] : null;
}

function getNumberFromJsonObject(value: Prisma.JsonValue, key: string): number {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 0;
  const record = value as Record<string, Prisma.JsonValue>;
  return typeof record[key] === 'number' ? record[key] : 0;
}

function activityBelongsToScope(activity: ActivityRow, scope: AnalyticsSourceScope): boolean {
  const page = getStringFromJsonObject(activity.details, 'page') ?? '';

  if (scope === 'site.neup.estate') {
    return Boolean(page) && !page.startsWith('/manage') && !page.startsWith('/bridge') && !page.startsWith('/api');
  }

  if (scope === 'app.neup.estate') {
    return page.startsWith('/manage') || page.startsWith('/accounts');
  }

  if (scope === 'site.custom.via.api') {
    return page.startsWith('/bridge/api.v1/property') || page.startsWith('/bridge/api.v1/inquiry');
  }

  return page.startsWith('/bridge') || page.startsWith('/api');
}

function buildScopeSummary(
  scope: AnalyticsSourceScope,
  dailyData: AnalyticsDailyPoint[],
  totals: AnalyticsMetricTotals,
): AnalyticsScopeSummary {
  return {
    scope,
    label: SOURCE_LABELS[scope].label,
    description: SOURCE_LABELS[scope].description,
    dailyData,
    totals,
  };
}

async function resolveRequestedWorkingProfile(searchParams?: Promise<SearchParams>): Promise<string | null> {
  const resolved = (await searchParams) ?? {};
  const value = resolved.workingProfile;
  const selected = Array.isArray(value) ? value[0] : value;
  return selected?.trim() || null;
}

async function getAgencyContextAccountId(accountId: string, requestedWorkingProfile: string | null): Promise<string> {
  if (requestedWorkingProfile) {
    const [agencyMembers, agentMap] = await Promise.all([
      getAgencyMapsByAgency(requestedWorkingProfile),
      prisma.agencyAgentMap.findFirst({
        where: { agencyId: requestedWorkingProfile, agentId: accountId, status: 'active' },
        select: { id: true },
      }),
    ]);

    const allowed =
      requestedWorkingProfile === accountId ||
      agencyMembers.some((member) => member.accountId === accountId) ||
      Boolean(agentMap);

    if (allowed) return requestedWorkingProfile;
  }

  const [account, agencyMap, agencyAgentMap] = await Promise.all([
    prisma.account.findUnique({
      where: { id: accountId },
      select: { workingProfile: true, displayName: true },
    }),
    getAgencyMapByAccount(accountId),
    prisma.agencyAgentMap.findFirst({
      where: { agentId: accountId, status: 'active' },
      select: { agencyId: true },
    }),
  ]);

  return account?.workingProfile || agencyMap?.agencyAccountId || agencyAgentMap?.agencyId || accountId;
}

async function buildContext(level: AnalyticsLevel, accountId: string, requestedWorkingProfile: string | null): Promise<AccountContext | null> {
  if (level === 'root') {
    const canViewRoot = await hasPermission(PERMISSIONS.root.propertiesView);
    if (!canViewRoot) return null;
    return { level, label: 'Root', contextLabel: 'All agencies, accounts, and users' };
  }

  if (level === 'user') {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, displayName: true },
    });
    const propertyIds = await getPropertyIdsForAccounts([accountId]);

    return {
      level,
      label: 'User',
      contextLabel: account?.displayName || accountId,
      accountIds: [accountId],
      propertyIds,
    };
  }

  const agencyAccountId = await getAgencyContextAccountId(accountId, requestedWorkingProfile);
  const [agencyAccount, agencyMembers, agencyAgents] = await Promise.all([
    prisma.account.findUnique({
      where: { id: agencyAccountId },
      select: { id: true, displayName: true },
    }),
    getAgencyMapsByAgency(agencyAccountId),
    prisma.agencyAgentMap.findMany({
      where: { agencyId: agencyAccountId, status: 'active' },
      select: { agentId: true },
    }),
  ]);
  const accountIds = Array.from(new Set([
    agencyAccountId,
    ...agencyMembers.map((member) => member.accountId),
    ...agencyAgents.map((member) => member.agentId),
  ]));
  const propertyIds = await getPropertyIdsForAccounts(accountIds, agencyAccountId);

  return {
    level,
    label: 'Agency',
    contextLabel: agencyAccount?.displayName || agencyAccountId,
    accountIds,
    propertyIds,
  };
}

async function getPropertyIdsForAccounts(accountIds: string[], agencyId?: string): Promise<string[]> {
  if (!accountIds.length && !agencyId) return [];

  const properties = await prisma.property.findMany({
    where: {
      isDeleted: false,
      OR: [
        agencyId ? { agency: agencyId } : {},
        accountIds.length ? { agent: { in: accountIds } } : {},
      ].filter((filter) => Object.keys(filter).length > 0),
    },
    select: { id: true },
  });

  return properties.map((property) => property.id);
}

function buildAccountFilter(context: AccountContext): Prisma.StringFilter | undefined {
  return context.accountIds?.length ? { in: context.accountIds } : undefined;
}

function buildPropertyFilter(context: AccountContext): Prisma.StringFilter | undefined {
  if (!context.accountIds) return undefined;
  return { in: context.propertyIds ?? [] };
}

async function getActivities(context: AccountContext, from: Date, to: Date): Promise<ActivityRow[]> {
  return prisma.activity.findMany({
    where: {
      accountId: buildAccountFilter(context),
      activityOn: { gte: from, lt: to },
    },
    select: {
      accountId: true,
      title: true,
      details: true,
      activityOn: true,
    },
  });
}

async function buildNativeScopeSummary(
  scope: Extract<AnalyticsSourceScope, 'site.neup.estate' | 'app.neup.estate'>,
  context: AccountContext,
  from: Date,
  to: Date,
): Promise<AnalyticsScopeSummary> {
  const dailyData = makeDailyData(from);
  const totals = makeEmptyTotals();
  const accountFilter = buildAccountFilter(context);
  const propertyFilter = buildPropertyFilter(context);
  const visitOrFilters = [
    propertyFilter ? { propertyId: propertyFilter } : null,
    accountFilter ? { agentId: accountFilter } : null,
  ].filter((filter): filter is NonNullable<typeof filter> => Boolean(filter));
  const [activities, propertyViews, savedProperties, clientLinks, leads, inquiries, visits, properties] = await Promise.all([
    getActivities(context, from, to),
    prisma.propertyView.findMany({
      where: {
        accountId: accountFilter,
        propertyId: propertyFilter,
        viewedAt: { gte: from, lt: to },
      },
      select: { viewedAt: true },
    }),
    prisma.savedProperty.findMany({
      where: {
        accountId: accountFilter,
        propertyId: propertyFilter,
        savedAt: { gte: from, lt: to },
      },
      select: { savedAt: true },
    }),
    prisma.clientLink.findMany({
      where: { trackerId: accountFilter },
      select: { id: true },
    }),
    prisma.sharedLeads.findMany({
      where: {
        owner: accountFilter,
        createdAt: { gte: from, lt: to },
      },
      select: { createdAt: true },
    }),
    prisma.inquiry.findMany({
      where: {
        propertyId: propertyFilter,
        createdAt: { gte: from, lt: to },
      },
      select: { createdAt: true },
    }),
    prisma.visitRequest.findMany({
      where: {
        ...(visitOrFilters.length ? { OR: visitOrFilters } : {}),
        createdAt: { gte: from, lt: to },
      },
      select: { createdAt: true },
    }),
    prisma.property.findMany({
      where: {
        isDeleted: false,
        id: propertyFilter,
        createdAt: { gte: from, lt: to },
      },
      select: { createdAt: true },
    }),
  ]);

  for (const activity of activities) {
    if (!activityBelongsToScope(activity, scope)) continue;
    totals.reach += 1;
    totals.interactions += activity.title === 'page_view' ? getNumberFromJsonObject(activity.details, 'duration') : 1;
    addDailyValue(dailyData, from, activity.activityOn, 'Reach');
    addDailyValue(dailyData, from, activity.activityOn, 'Interactions', activity.title === 'page_view' ? getNumberFromJsonObject(activity.details, 'duration') : 1);
  }

  if (scope === 'site.neup.estate') {
    for (const view of propertyViews) {
      totals.reach += 1;
      addDailyValue(dailyData, from, view.viewedAt, 'Reach');
    }
    for (const saved of savedProperties) {
      totals.interactions += 1;
      addDailyValue(dailyData, from, saved.savedAt, 'Interactions');
    }
    for (const inquiry of inquiries) {
      totals.inquiries += 1;
      addDailyValue(dailyData, from, inquiry.createdAt, 'Inquiries');
    }
    for (const visit of visits) {
      totals.interactions += 1;
      addDailyValue(dailyData, from, visit.createdAt, 'Interactions');
    }
  } else {
    for (const lead of leads) {
      totals.leads += 1;
      addDailyValue(dailyData, from, lead.createdAt, 'Leads');
    }
    for (const property of properties) {
      totals.interactions += 1;
      addDailyValue(dailyData, from, property.createdAt, 'Interactions');
    }
    totals.leads += clientLinks.length;
  }

  return buildScopeSummary(scope, dailyData, totals);
}

async function buildApiScopeSummary(
  scope: Extract<AnalyticsSourceScope, 'site.custom.via.api' | 'app.custom.via.api'>,
  context: AccountContext,
  from: Date,
  to: Date,
): Promise<AnalyticsScopeSummary> {
  const dailyData = makeDailyData(from);
  const totals = makeEmptyTotals();
  const propertyFilter = buildPropertyFilter(context);
  const routePrefix =
    scope === 'site.custom.via.api'
      ? ['bridge/api.v1/property/list', 'bridge/api.v1/property/view', 'bridge/api.v1/inquiry']
      : ['bridge/api.v1/property/create', 'bridge/api.v1/property/edit', 'bridge/api.v1/accounts', 'bridge/api.v1/auth'];

  const [logs, inquiries, createdProperties] = await Promise.all([
    prisma.siteDevLogEntry.findMany({
      where: {
        source: 'api',
        createdAt: { gte: from, lt: to },
        OR: routePrefix.map((prefix) => ({ summary: { startsWith: prefix } })),
      },
      select: { createdAt: true, statusCode: true },
    }),
    scope === 'site.custom.via.api'
      ? prisma.inquiry.findMany({
          where: {
            propertyId: propertyFilter,
            createdAt: { gte: from, lt: to },
          },
          select: { createdAt: true },
        })
      : Promise.resolve([]),
    scope === 'app.custom.via.api'
      ? prisma.property.findMany({
          where: {
            isDeleted: false,
            id: propertyFilter,
            createdAt: { gte: from, lt: to },
          },
          select: { createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  for (const log of logs) {
    totals.reach += 1;
    if (!log.statusCode || log.statusCode < 400) {
      totals.interactions += 1;
    }
    addDailyValue(dailyData, from, log.createdAt, 'Reach');
    if (!log.statusCode || log.statusCode < 400) {
      addDailyValue(dailyData, from, log.createdAt, 'Interactions');
    }
  }

  for (const inquiry of inquiries) {
    totals.inquiries += 1;
    addDailyValue(dailyData, from, inquiry.createdAt, 'Inquiries');
  }

  for (const property of createdProperties) {
    totals.leads += 1;
    addDailyValue(dailyData, from, property.createdAt, 'Leads');
  }

  return buildScopeSummary(scope, dailyData, totals);
}

async function buildLevelSummary(context: AccountContext, from: Date, to: Date): Promise<AnalyticsLevelSummary> {
  const scopeSummaries = await Promise.all([
    buildNativeScopeSummary('site.neup.estate', context, from, to),
    buildNativeScopeSummary('app.neup.estate', context, from, to),
    buildApiScopeSummary('site.custom.via.api', context, from, to),
    buildApiScopeSummary('app.custom.via.api', context, from, to),
  ]);

  return {
    level: context.level,
    label: context.label,
    contextLabel: context.contextLabel,
    scopeSummaries,
    totals: sumTotals(scopeSummaries),
  };
}

export async function getAnalyticsDashboardData(searchParams?: Promise<SearchParams>): Promise<AnalyticsDashboardData> {
  const auth = await getAuthenticatedAccount();
  if (!auth.success || !auth.account.aid) {
    return {
      periodLabel: 'Last 30 days',
      generatedAt: new Date().toISOString(),
      levels: [],
    };
  }

  const { from, to } = getPeriod();
  const requestedWorkingProfile = await resolveRequestedWorkingProfile(searchParams);
  const contexts = (await Promise.all([
    buildContext('root', auth.account.aid, requestedWorkingProfile),
    buildContext('agency', auth.account.aid, requestedWorkingProfile),
    buildContext('user', auth.account.aid, requestedWorkingProfile),
  ])).filter((context): context is AccountContext => Boolean(context));

  const levels = await Promise.all(contexts.map((context) => buildLevelSummary(context, from, to)));

  return {
    periodLabel: 'Last 30 days',
    generatedAt: new Date().toISOString(),
    levels,
  };
}
