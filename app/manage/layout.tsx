import { ManageSidebar } from '@/components/manage/manage-sidebar';
import { getManageLayoutPermissionState } from '@/services/permissions';
import { Sidebar as SidebarLayout } from '@neup/components/layout/sidebar.v1';

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    canDashboard,
    canAnalytics,
    canIntelListings,
    canPropertyView,
    canRootPropertiesView,
    canCollectionView,
    canAccountsView,
    canLeadsHomeView,
    canLeadsBaseView,
    canLeadsMyView,
    canLeadsSharedView,
    canLeadsAlertsView,
    canReviewsView,
    canAgentMapView,
    canNotificationView,
  } = await getManageLayoutPermissionState();

  const sidebar = (
    <ManageSidebar
      canDashboard={canDashboard}
      canAnalytics={canAnalytics}
      canIntelListings={canIntelListings}
      canPropertyView={canPropertyView}
      canRootPropertiesView={canRootPropertiesView}
      canCollectionView={canCollectionView}
      canAccountsView={canAccountsView}
      canLeadsHomeView={canLeadsHomeView}
      canLeadsBaseView={canLeadsBaseView}
      canLeadsMyView={canLeadsMyView}
      canLeadsSharedView={canLeadsSharedView}
      canLeadsAlertsView={canLeadsAlertsView}
      canReviewsView={canReviewsView}
      canAgentMapView={canAgentMapView}
      canNotificationView={canNotificationView}
    />
  );

  return (
    <div
      className="min-h-screen w-full bg-white text-[var(--foreground)]"
      style={{
        '--site-header-height': '4rem',
        '--layer-sidebar': 40,
        '--layer-content': 0,
        '--background': '#fff',
        '--sidebar-background': '#fff',
      } as React.CSSProperties}
    >
      <SidebarLayout sidebar={sidebar}>
        <div className="-mt-4 md:-mt-4">{children}</div>
      </SidebarLayout>
    </div>
  );
}
