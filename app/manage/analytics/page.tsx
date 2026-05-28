
import { AnalyticsDashboard } from '@/components/manage/analytics-dashboard';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';

export default async function AnalyticsPage() {
  await requirePagePermission(PERMISSIONS.manage.analyticsView);
  return <AnalyticsDashboard />;
}
