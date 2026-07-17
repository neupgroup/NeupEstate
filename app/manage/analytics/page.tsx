
import { AnalyticsDashboard } from '@/components/manage/analytics-dashboard';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';

export default async function AnalyticsPage() {
  await requirePagePermission(PERMISSIONS.manage.analyticsView);
  return <AnalyticsDashboard />;
}
