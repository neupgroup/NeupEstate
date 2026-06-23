import { Activity, AlertTriangle, Settings2, Webhook } from 'lucide-react';
import { ClientLink } from '@/components/client-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSiteDevLogSummary } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

export default async function ManageSitePage() {
  const summary = await getSiteDevLogSummary();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Site</h2>
          <p className="text-sm text-muted-foreground">
            Monitor incoming API requests, webhook traffic, and operational errors.
          </p>
        </div>
        <Badge variant={summary.enabled ? 'default' : 'secondary'}>
          {summary.enabled ? 'Dev logs enabled' : 'Dev logs disabled'}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total request logs</CardDescription>
            <CardTitle className="text-3xl">{summary.totalLogs}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            Recorded while dev logs are enabled
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>API requests</CardDescription>
            <CardTitle className="text-3xl">{summary.apiLogs}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Internal and bridge API traffic
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Webhook requests</CardDescription>
            <CardTitle className="text-3xl">{summary.webhookLogs}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Webhook className="h-4 w-4" />
            Incoming integrations and events
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Error logs</CardDescription>
            <CardTitle className="text-3xl">{summary.recentErrors}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            Application problems captured separately
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Request observability</CardTitle>
            <CardDescription>
              Review request history, webhook payloads, and response outcomes from the new site log stream.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <ClientLink href="/manage/site/devlogs" className="rounded-lg border p-4 transition-colors hover:bg-muted/40">
              <div className="font-medium">Open dev logs</div>
              <p className="mt-1 text-sm text-muted-foreground">
                View every recorded API and webhook request with request and response details.
              </p>
            </ClientLink>
            <ClientLink href="/manage/site/errors" className="rounded-lg border p-4 transition-colors hover:bg-muted/40">
              <div className="font-medium">Open error logs</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Review application problems separately from request traffic.
              </p>
            </ClientLink>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>
              Dev logging is controlled from settings so it can be turned on only when needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientLink
              href="/manage/settings/site/devlogs"
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/40"
            >
              <Settings2 className="h-4 w-4" />
              Manage dev log setting
            </ClientLink>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
