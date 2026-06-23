import { Info } from 'lucide-react';
import { ClearSiteDevLogsButton } from '@/components/manage/clear-site-dev-logs-button';
import { Pagination } from '@/components/manage/pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ClientLink } from '@/components/client-link';
import { getSiteDevLogs, getSiteDevLogSetting } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

const LOGS_PER_PAGE = 20;

export default async function SiteDevLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; source?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const currentPage = Number(resolvedSearchParams?.page) || 1;
  const source = resolvedSearchParams?.source === 'api' || resolvedSearchParams?.source === 'webhook'
    ? resolvedSearchParams.source
    : undefined;
  const offset = (currentPage - 1) * LOGS_PER_PAGE;

  const [{ logs, totalCount }, setting] = await Promise.all([
    getSiteDevLogs({ limit: LOGS_PER_PAGE, offset, source }),
    getSiteDevLogSetting(),
  ]);
  const totalPages = Math.ceil(totalCount / LOGS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Dev Logs</h2>
          <p className="text-sm text-muted-foreground">
            {setting.enabled
              ? `Showing ${logs.length} of ${totalCount} recorded requests.`
              : 'Dev logs are currently disabled. Turn them on in settings to start recording requests.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClientLink href="/manage/site/devlogs" className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/40">
            All
          </ClientLink>
          <ClientLink href="/manage/site/devlogs?source=api" className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/40">
            API
          </ClientLink>
          <ClientLink href="/manage/site/devlogs?source=webhook" className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/40">
            Webhooks
          </ClientLink>
          <ClearSiteDevLogsButton />
        </div>
      </div>

      {logs.length > 0 ? (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={log.source === 'webhook' ? 'default' : 'secondary'}>
                        {log.source}
                      </Badge>
                      {log.method ? <Badge variant="outline">{log.method}</Badge> : null}
                      {typeof log.statusCode === 'number' ? (
                        <Badge variant={log.statusCode >= 400 ? 'destructive' : 'outline'}>
                          {log.statusCode}
                        </Badge>
                      ) : null}
                      {log.outcome ? <Badge variant="outline">{log.outcome}</Badge> : null}
                    </div>
                    <div className="font-mono text-sm">{log.path}</div>
                    {log.summary ? (
                      <p className="text-sm text-muted-foreground">{log.summary}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>{new Date(log.createdAt).toLocaleString()}</div>
                    {typeof log.durationMs === 'number' ? <div>{log.durationMs} ms</div> : null}
                  </div>
                </div>

                {log.details ? (
                  <details className="rounded-md border bg-muted/20 p-3">
                    <summary className="cursor-pointer text-sm font-medium">View request details</summary>
                    <pre className="mt-3 whitespace-pre-wrap break-words text-xs font-mono">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 ? <Pagination currentPage={currentPage} totalPages={totalPages} /> : null}
        </div>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No request logs recorded</AlertTitle>
          <AlertDescription>
            {setting.enabled
              ? 'No API or webhook requests have been captured yet.'
              : 'Enable dev logs in settings before requests will appear here.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
