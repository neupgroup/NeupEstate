import { ClientLink } from '@/components/client-link';
import { RelativeTime } from '@/components/manage/relative-time';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { prisma } from '@/core/database/prisma';
import { getAgencyMapByAccount, getAgencyMapsByAgency } from '@/services/agency-customization-service';
import { requireAuth } from '@/services/auth/account';
import { AlertCircle, ArrowLeft, Building2, CalendarCheck2, Eye, FileQuestion, Heart, TrendingUp, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';

type SearchParams = Record<string, string | string[] | undefined>;

type ActivityItem =
  | {
      id: string;
      kind: 'property';
      title: string;
      meta: string;
      createdAt: Date;
      href: string;
    }
  | {
      id: string;
      kind: 'inquiry';
      title: string;
      meta: string;
      createdAt: Date;
      href: string;
    }
  | {
      id: string;
      kind: 'visit';
      title: string;
      meta: string;
      createdAt: Date;
      href: string;
    };

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NPR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

async function getWorkingProfile(searchParams?: Promise<SearchParams>) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const value = resolvedSearchParams.workingProfile;
  return Array.isArray(value) ? value[0] : value?.trim() || null;
}

async function getAgencyAccessContext(accountId: string, searchParams?: Promise<SearchParams>) {
  const selectedAgency = await getWorkingProfile(searchParams);
  const membership = await getAgencyMapByAccount(accountId);
  const selectedAgencyMembers = selectedAgency
    ? await getAgencyMapsByAgency(selectedAgency)
    : [];

  const selectedAgencyIsAllowed =
    selectedAgency === null ||
    selectedAgency === accountId ||
    membership?.agencyAccountId === selectedAgency ||
    selectedAgencyMembers.some((member) => member.accountId === accountId);

  const agencyAccountId =
    selectedAgencyIsAllowed && selectedAgency
      ? selectedAgency
      : membership?.agencyAccountId ?? accountId;

  return {
    agencyAccountId,
    isSelectedAgencyAllowed: selectedAgencyIsAllowed,
    selectedAgency,
  };
}

async function getAgencyReportData(agencyAccountId: string) {
  const [agencyAccount, agencyMembers] = await Promise.all([
    prisma.account.findUnique({
      where: { id: agencyAccountId },
      select: { id: true, displayName: true, displayImage: true },
    }),
    getAgencyMapsByAgency(agencyAccountId),
  ]);

  const memberIds = Array.from(
    new Set([agencyAccountId, ...agencyMembers.map((member) => member.accountId)]),
  );

  const memberAccounts = memberIds.length
    ? await prisma.account.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, displayName: true, displayImage: true },
      })
    : [];

  const memberNameMap = new Map(
    memberAccounts.map((account) => [account.id, account.displayName || account.id]),
  );

  const properties = await prisma.property.findMany({
    where: {
      isDeleted: false,
      OR: [
        { agency: agencyAccountId },
        { agent: { in: memberIds } },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      agent: true,
      status: true,
      isApproved: true,
      createdAt: true,
      displayPrice: true,
      type: true,
      purpose: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const propertyIds = properties.map((property) => property.id);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    inquiries,
    visits,
    totalViews,
    recentViews,
    totalSaves,
    recentSaves,
  ] = propertyIds.length
    ? await Promise.all([
        prisma.inquiry.findMany({
          where: { propertyId: { in: propertyIds } },
          select: {
            id: true,
            propertyId: true,
            propertyTitle: true,
            name: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.visitRequest.findMany({
          where: {
            OR: [
              { propertyId: { in: propertyIds } },
              { agentId: { in: memberIds } },
            ],
          },
          select: {
            id: true,
            propertyId: true,
            propertyTitle: true,
            agentId: true,
            agentName: true,
            name: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.propertyView.count({
          where: { propertyId: { in: propertyIds } },
        }),
        prisma.propertyView.count({
          where: {
            propertyId: { in: propertyIds },
            viewedAt: { gte: thirtyDaysAgo },
          },
        }),
        prisma.savedProperty.count({
          where: { propertyId: { in: propertyIds } },
        }),
        prisma.savedProperty.count({
          where: {
            propertyId: { in: propertyIds },
            savedAt: { gte: thirtyDaysAgo },
          },
        }),
      ])
    : [[], [], 0, 0, 0, 0];

  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const newListings30 = properties.filter((property) => property.createdAt >= thirtyDaysAgo).length;
  const activeListings = properties.filter((property) => property.status === 'ACTIVE').length;
  const approvedListings = properties.filter((property) => property.isApproved).length;
  const pendingListings = properties.filter((property) => !property.isApproved).length;
  const totalListingValue = properties.reduce(
    (sum, property) => sum + Number(property.displayPrice || 0),
    0,
  );
  const inquiries30 = inquiries.filter((inquiry) => inquiry.createdAt >= thirtyDaysAgo).length;
  const visits30 = visits.filter((visit) => visit.createdAt >= thirtyDaysAgo).length;

  const agentSummaryMap = new Map<string, {
    agentId: string;
    agentName: string;
    listings: number;
    activeListings: number;
    inquiries: number;
    visits: number;
    newListings30: number;
    latestListingAt: Date | null;
  }>();

  for (const memberId of memberIds) {
    agentSummaryMap.set(memberId, {
      agentId: memberId,
      agentName: memberNameMap.get(memberId) ?? memberId,
      listings: 0,
      activeListings: 0,
      inquiries: 0,
      visits: 0,
      newListings30: 0,
      latestListingAt: null,
    });
  }

  for (const property of properties) {
    if (!property.agent) continue;
    const agentSummary = agentSummaryMap.get(property.agent);
    if (!agentSummary) continue;

    agentSummary.listings += 1;
    if (property.status === 'ACTIVE') agentSummary.activeListings += 1;
    if (property.createdAt >= thirtyDaysAgo) agentSummary.newListings30 += 1;
    if (!agentSummary.latestListingAt || property.createdAt > agentSummary.latestListingAt) {
      agentSummary.latestListingAt = property.createdAt;
    }
  }

  for (const inquiry of inquiries) {
    const property = propertyById.get(inquiry.propertyId);
    if (!property?.agent) continue;
    const agentSummary = agentSummaryMap.get(property.agent);
    if (agentSummary) {
      agentSummary.inquiries += 1;
    }
  }

  for (const visit of visits) {
    const agentSummary = agentSummaryMap.get(visit.agentId);
    if (agentSummary) {
      agentSummary.visits += 1;
    }
  }

  const topAgents = Array.from(agentSummaryMap.values())
    .filter((agent) => agent.listings > 0 || agent.inquiries > 0 || agent.visits > 0)
    .sort((left, right) => {
      const scoreLeft = left.inquiries * 3 + left.visits * 2 + left.activeListings;
      const scoreRight = right.inquiries * 3 + right.visits * 2 + right.activeListings;
      return scoreRight - scoreLeft;
    })
    .slice(0, 6);

  const recentActivity: ActivityItem[] = [
    ...properties.slice(0, 4).map((property) => ({
      id: `property-${property.id}`,
      kind: 'property' as const,
      title: property.title,
      meta: `${property.type} · ${property.purpose} · ${memberNameMap.get(property.agent || '') ?? 'Unassigned'}`,
      createdAt: property.createdAt,
      href: `/manage/properties/${property.id}`,
    })),
    ...inquiries.slice(0, 4).map((inquiry) => ({
      id: `inquiry-${inquiry.id}`,
      kind: 'inquiry' as const,
      title: inquiry.propertyTitle,
      meta: `${inquiry.name} submitted an inquiry`,
      createdAt: inquiry.createdAt,
      href: '/manage/inquiries',
    })),
    ...visits.slice(0, 4).map((visit) => ({
      id: `visit-${visit.id}`,
      kind: 'visit' as const,
      title: visit.propertyTitle,
      meta: `${visit.name} requested a visit with ${memberNameMap.get(visit.agentId) ?? visit.agentName}`,
      createdAt: visit.createdAt,
      href: '/manage/visit-requests',
    })),
  ]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 8);

  return {
    agencyAccountId,
    agencyName: agencyAccount?.displayName || agencyAccountId,
    totalMembers: memberIds.length,
    properties,
    topAgents,
    recentActivity,
    totals: {
      activeListings,
      approvedListings,
      pendingListings,
      newListings30,
      inquiries: inquiries.length,
      inquiries30,
      visits: visits.length,
      visits30,
      totalViews,
      recentViews,
      totalSaves,
      recentSaves,
      totalListingValue,
    },
  };
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

export default async function ManageReportPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const authAccount = await requireAuth();
  const { agencyAccountId, isSelectedAgencyAllowed, selectedAgency } = await getAgencyAccessContext(
    authAccount.aid,
    searchParams,
  );
  const report = await getAgencyReportData(agencyAccountId);

  const inquiryToVisitRate = report.totals.inquiries
    ? (report.totals.visits / report.totals.inquiries) * 100
    : 0;
  const saveToInquiryRate = report.totals.totalSaves
    ? (report.totals.inquiries / report.totals.totalSaves) * 100
    : 0;
  const viewToSaveRate = report.totals.totalViews
    ? (report.totals.totalSaves / report.totals.totalViews) * 100
    : 0;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <ClientLink
          href={selectedAgency ? `/manage/team?workingProfile=${encodeURIComponent(agencyAccountId)}` : '/manage/team'}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to team management
        </ClientLink>

        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Report</h2>
          <Badge variant="secondary">
            <Building2 className="mr-1 h-3.5 w-3.5" />
            {report.agencyName}
          </Badge>
          <Badge variant="outline">
            <UsersRound className="mr-1 h-3.5 w-3.5" />
            {report.totalMembers} members
          </Badge>
        </div>

        <p className="max-w-3xl text-sm text-muted-foreground">
          Operational snapshot for the selected agency. Metrics below are scoped to this agency’s
          members and property inventory, with a 30-day trend view where the data model supports it.
        </p>
      </div>

      {!isSelectedAgencyAllowed && selectedAgency ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Selected agency was reset</AlertTitle>
          <AlertDescription>
            You do not have access to the requested agency, so the report has been loaded for your
            default agency instead.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Listings"
          value={report.totals.activeListings.toString()}
          description={`${report.totals.newListings30} new in the last 30 days`}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Inquiries"
          value={report.totals.inquiries.toString()}
          description={`${report.totals.inquiries30} received in the last 30 days`}
          icon={<FileQuestion className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Visit Requests"
          value={report.totals.visits.toString()}
          description={`${report.totals.visits30} requested in the last 30 days`}
          icon={<CalendarCheck2 className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Portfolio Value"
          value={formatCurrency(report.totals.totalListingValue)}
          description={`${report.properties.length} tracked listing${report.properties.length === 1 ? '' : 's'}`}
          icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Conversion Signals</CardTitle>
            <CardDescription>
              A simple funnel view based on property engagement captured in the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                View to Save
              </div>
              <p className="mt-3 text-2xl font-semibold">{formatPercent(viewToSaveRate)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCompactNumber(report.totals.totalViews)} views and {formatCompactNumber(report.totals.totalSaves)} saves total
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Heart className="h-4 w-4" />
                Save to Inquiry
              </div>
              <p className="mt-3 text-2xl font-semibold">{formatPercent(saveToInquiryRate)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Measures how saved listings convert into direct questions
              </p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarCheck2 className="h-4 w-4" />
                Inquiry to Visit
              </div>
              <p className="mt-3 text-2xl font-semibold">{formatPercent(inquiryToVisitRate)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Measures visit intent after direct conversation starts
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Health</CardTitle>
            <CardDescription>
              Quick breakdown of publish readiness for the current agency inventory.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Approved listings</span>
              <span className="font-medium">{report.totals.approvedListings}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Pending approval</span>
              <span className="font-medium">{report.totals.pendingListings}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Views in last 30 days</span>
              <span className="font-medium">{formatCompactNumber(report.totals.recentViews)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm text-muted-foreground">Saves in last 30 days</span>
              <span className="font-medium">{formatCompactNumber(report.totals.recentSaves)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Top Agents</CardTitle>
            <CardDescription>
              Ranked by agency activity across active listings, inquiries, and visit requests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.topAgents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Listings</TableHead>
                    <TableHead className="text-right">Inquiries</TableHead>
                    <TableHead className="text-right">Visits</TableHead>
                    <TableHead className="text-right">New 30d</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.topAgents.map((agent) => (
                    <TableRow key={agent.agentId}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{agent.agentName}</div>
                          <div className="text-xs text-muted-foreground">
                            {agent.activeListings} active
                            {agent.latestListingAt ? ` · latest listing ${agent.latestListingAt.toLocaleDateString()}` : ''}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{agent.listings}</TableCell>
                      <TableCell className="text-right">{agent.inquiries}</TableCell>
                      <TableCell className="text-right">{agent.visits}</TableCell>
                      <TableCell className="text-right">{agent.newListings30}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No agent activity has been recorded for this agency yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest property, inquiry, and visit events associated with this agency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {report.recentActivity.map((activity) => (
                  <ClientLink
                    key={activity.id}
                    href={activity.href}
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {activity.kind}
                          </Badge>
                          <p className="truncate font-medium">{activity.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.meta}</p>
                      </div>
                      <div className="shrink-0 text-xs text-muted-foreground">
                        <RelativeTime timestamp={activity.createdAt.toISOString()} />
                      </div>
                    </div>
                  </ClientLink>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No recent reportable activity yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
