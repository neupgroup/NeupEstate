import { SiteDevLogsToggle } from '@/components/manage/site-dev-logs-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSiteDevLogSetting } from '@/services/site-dev-log-service';

export const dynamic = 'force-dynamic';

export default async function SiteDevLogsSettingsPage() {
  const setting = await getSiteDevLogSetting();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold leading-none tracking-tight">Site Dev Logs</h2>
        <p className="text-sm text-muted-foreground">
          Turn request logging on or off for API and webhook traffic.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request logging</CardTitle>
          <CardDescription>
            When enabled, the app records request and response summaries for the site dev logs page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SiteDevLogsToggle enabled={setting.enabled} />
          <p className="text-sm text-muted-foreground">
            Update the `.env` file to update `SITE_DEV_LOGGING_STATUS`. Set it to `active` to enable request logging. Any other value, or leaving it undefined, keeps logging inactive.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
