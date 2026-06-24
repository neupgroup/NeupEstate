import { Info } from 'lucide-react';
import { ClearSiteDevLogsButton } from '@/components/manage/clear-site-dev-logs-button';
import { Pagination } from '@/components/manage/pagination';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
              : 'Dev logs are currently disabled. Update `.env` and set `SITE_DEV_LOGGING_STATUS=active` to start recording requests.'}
          </p>
        </div>
      </div>

      {logs.length > 0 ? (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id} className="min-w-0 overflow-hidden">
              <CardContent className="min-w-0 space-y-3 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 space-y-2">
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
                    <div className="min-w-0 whitespace-normal break-all font-mono text-sm">
                      {log.path}
                    </div>
                    {log.summary ? (
                      <p className="whitespace-normal break-all text-sm text-muted-foreground">
                        {log.summary}
                      </p>
                    ) : null}
                  </div>
                  <div className="min-w-0 whitespace-normal break-all text-right text-xs text-muted-foreground">
                    <div>{new Date(log.createdAt).toLocaleString()}</div>
                    {typeof log.durationMs === 'number' ? <div>{log.durationMs} ms</div> : null}
                  </div>
                </div>

                {log.details ? (
                  <details className="min-w-0 rounded-md border bg-muted/20 p-3">
                    <summary className="cursor-pointer text-sm font-medium">View request details</summary>
                    <pre className="mt-3 min-w-0 whitespace-pre-wrap break-all text-xs font-mono">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 ? <Pagination currentPage={currentPage} totalPages={totalPages} /> : null}
          <div className="flex justify-start">
            <ClearSiteDevLogsButton />
          </div>
        </div>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No request logs recorded</AlertTitle>
          <AlertDescription>
            {setting.enabled
              ? 'No API or webhook requests have been captured yet.'
              : 'Update `.env` and set `SITE_DEV_LOGGING_STATUS=active` before requests will appear here.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
