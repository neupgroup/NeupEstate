'use client';

import type { ReactNode } from 'react';
import { Building2, FileQuestion, Globe2, MousePointerClick, Network, ShieldCheck, User, UserPlus, Users } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { AnalyticsDashboardData, AnalyticsLevelSummary, AnalyticsScopeSummary } from '@/core/analytics/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

const chartConfig = {
  Reach: { label: 'Reach', color: 'hsl(var(--primary))' },
  Interactions: { label: 'Interactions', color: 'hsl(var(--accent))' },
  Leads: { label: 'Leads', color: 'hsl(var(--destructive))' },
  Inquiries: { label: 'Inquiries', color: 'hsl(var(--chart-4))' },
} satisfies ChartConfig;

const levelIcons: Record<AnalyticsLevelSummary['level'], ReactNode> = {
  root: <ShieldCheck className="h-4 w-4" />,
  agency: <Building2 className="h-4 w-4" />,
  user: <User className="h-4 w-4" />,
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatNumber(value)}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ScopeCard({ summary }: { summary: AnalyticsScopeSummary }) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {summary.scope.includes('custom') ? <Network className="h-4 w-4" /> : <Globe2 className="h-4 w-4" />}
              {summary.label}
            </CardTitle>
            <CardDescription>{summary.description}</CardDescription>
          </div>
          <Badge variant="secondary">{formatNumber(summary.totals.reach + summary.totals.interactions)} events</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Reach</p>
            <p className="font-semibold">{formatNumber(summary.totals.reach)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Interactions</p>
            <p className="font-semibold">{formatNumber(summary.totals.interactions)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Leads</p>
            <p className="font-semibold">{formatNumber(summary.totals.leads)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inquiries</p>
            <p className="font-semibold">{formatNumber(summary.totals.inquiries)}</p>
          </div>
        </div>

        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ChartContainer config={chartConfig} className="min-h-[220px] w-full">
              <LineChart
                accessibilityLayer
                data={summary.dailyData}
                margin={{ left: 12, right: 12, top: 8, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => String(value).slice(0, 6)}
                />
                <Tooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Legend />
                <Line dataKey="Reach" type="natural" stroke="var(--color-Reach)" strokeWidth={2} dot={false} />
                <Line dataKey="Interactions" type="natural" stroke="var(--color-Interactions)" strokeWidth={2} dot={false} />
                <Line dataKey="Leads" type="natural" stroke="var(--color-Leads)" strokeWidth={2} dot={false} />
                <Line dataKey="Inquiries" type="natural" stroke="var(--color-Inquiries)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function LevelPanel({ level }: { level: AnalyticsLevelSummary }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            {levelIcons[level.level]}
            {level.label}
          </h3>
          <p className="text-sm text-muted-foreground">{level.contextLabel}</p>
        </div>
        <Badge variant="outline">{formatNumber(level.totals.reach + level.totals.interactions + level.totals.leads + level.totals.inquiries)} total signals</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Reach"
          value={level.totals.reach}
          icon={<Users className="h-4 w-4" />}
          description="Tracked visits and API reach in this period."
        />
        <StatCard
          title="Total Interactions"
          value={level.totals.interactions}
          icon={<MousePointerClick className="h-4 w-4" />}
          description="Saves, visits, app work, API success, and time spent."
        />
        <StatCard
          title="Total Leads"
          value={level.totals.leads}
          icon={<UserPlus className="h-4 w-4" />}
          description="CRM leads, shared leads, and API-created listing signals."
        />
        <StatCard
          title="Total Inquiries"
          value={level.totals.inquiries}
          icon={<FileQuestion className="h-4 w-4" />}
          description="Property inquiries tied to this level."
        />
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        {level.scopeSummaries.map((summary) => (
          <ScopeCard key={summary.scope} summary={summary} />
        ))}
      </div>
    </div>
  );
}

const emptyAnalyticsData: AnalyticsDashboardData = {
  periodLabel: 'Last 30 days',
  generatedAt: '',
  levels: [],
};

export function AnalyticsDashboard({ data = emptyAnalyticsData }: { data?: AnalyticsDashboardData }) {
  const defaultLevel = data.levels[0]?.level;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground">Real data across root, agency, and user levels.</p>
        </div>
        <div className="text-sm text-muted-foreground">{data.periodLabel}</div>
      </div>

      {defaultLevel ? (
        <Tabs defaultValue={defaultLevel} className="space-y-4">
          <TabsList className="grid h-auto w-full grid-cols-1 sm:grid-cols-3">
            {data.levels.map((level) => (
              <TabsTrigger key={level.level} value={level.level} className="gap-2">
                {levelIcons[level.level]}
                {level.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {data.levels.map((level) => (
            <TabsContent key={level.level} value={level.level} className="mt-0">
              <LevelPanel level={level} />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No analytics available</CardTitle>
            <CardDescription>Sign in with an account that can view manage analytics.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
