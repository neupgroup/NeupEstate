import { ManageSidebar } from '@/components/manage/manage-sidebar';
import { createAccount } from '@/services/account/create';
import { getManageLayoutPermissionState } from '@/services/permissions';

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await createAccount();

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
    canFaqView,
    canAgentMapView,
    canNotificationView,
  } = await getManageLayoutPermissionState();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr] items-start">

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
          canFaqView={canFaqView}
          canAgentMapView={canAgentMapView}
          canNotificationView={canNotificationView}
        />

        <main className="py-8">{children}</main>

      </div>
    </div>
  );
}
