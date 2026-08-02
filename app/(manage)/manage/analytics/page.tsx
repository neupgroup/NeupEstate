
import { AnalyticsDashboard } from '@/components/manage/analytics-dashboard';
import { getAnalyticsDashboardData } from '@/services/analytics-service';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';

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
