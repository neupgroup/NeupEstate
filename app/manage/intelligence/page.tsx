import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClientLink } from '@/components/client-link';
import { BarChart2, TrendingUp, ListChecks, Swords, FileText, Bell } from 'lucide-react';
import { TrackChangesButton } from './track-changes-button';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { prisma } from '@/logica/core/prisma';
import { getCurrentAccountId } from '@/app/actions';

const sections = [
  {
    href: '/manage/intelligence/listings',
    icon: <ListChecks className="h-6 w-6 text-primary" />,
    title: 'Listings Intelligence',
    description: 'Analyse listing performance, trends, and market positioning across your property portfolio.',
  },
  {
    href: '/manage/intelligence/sales',
    icon: <TrendingUp className="h-6 w-6 text-primary" />,
    title: 'Sales Intelligence',
    description: 'Track sales velocity, conversion rates, and revenue insights to drive better outcomes.',
  },
  {
    href: '/manage/intelligence/competition',
    icon: <Swords className="h-6 w-6 text-primary" />,
    title: 'Competition',
    description: 'Manage competitors, track their listings and sources, and benchmark against your portfolio.',
  },
  {
    href: '/manage/intelligence/logs',
    icon: <FileText className="h-6 w-6 text-primary" />,
    title: 'Logs',
    description: 'Review extraction logs, crawl activity, and error history for the intelligence pipeline.',
  },
  {
    href: '/manage/intelligence/criteria',
    icon: <Bell className="h-6 w-6 text-primary" />,
    title: 'Criteria',
    description: 'Set your alert criteria and review the matches that are being tracked for your account.',
  },
];

export default async function IntelligencePage() {
  await requirePagePermission(PERMISSIONS.manage.intelligenceListingsView);
  const accountId = await getCurrentAccountId();
  const alerts = accountId
    ? await prisma.intelligenceAlert.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          mapping: true,
          competitor: true,
        },
      })
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart2 className="h-6 w-6" />
            Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Data-driven insights across your listings and sales pipeline.
          </p>
        </div>
        <TrackChangesButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
        {sections.map((s) => (
          <ClientLink key={s.href} href={s.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                {s.icon}
                <CardTitle className="text-lg">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{s.description}</CardDescription>
              </CardContent>
            </Card>
          </ClientLink>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Alerts</CardTitle>
          <CardDescription>
            These are the latest listings that matched your saved criteria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No alerts yet. Add criteria in the{' '}
              <ClientLink href="/manage/intelligence/criteria" className="text-primary underline">
                Criteria
              </ClientLink>
              {' '}page to start tracking matches.
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">Alert #{alert.id.slice(0, 8)}</span>
                      <Badge variant="secondary">{alert.status || 'pending'}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Criteria: {alert.mapping.cPurpose}
                      {alert.mapping.cLocation ? ` · ${alert.mapping.cLocation}` : ''}
                      {alert.mapping.cType ? ` · ${alert.mapping.cType}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Matched listing: {alert.competitor.name}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
