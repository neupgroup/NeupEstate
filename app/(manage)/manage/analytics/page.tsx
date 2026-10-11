
import { AnalyticsDashboard } from '@/components/manage/analytics-dashboard';
import { getAnalyticsDashboardData } from '@/services/analytics/reports/dashboard';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permission-names';;

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requirePagePermission(PERMISSIONS.manage.analyticsView);
  const data = await getAnalyticsDashboardData(searchParams);

  return <AnalyticsDashboard data={data} />;
}
