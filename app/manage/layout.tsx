
import { cookies } from 'next/headers';
import { ManageSidebar } from '@/components/manage/manage-sidebar';
import { createAccountInApp } from '@/logica/auth/account';
import { hasPermission } from '@/logica/auth/authorization';
import { PERMISSIONS } from '@/logica/auth/permissions';

export default async function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth_account')?.value ?? null;

  if (authCookie) {
    await createAccountInApp(authCookie).catch(() => null);
  }

  const [
    canDashboard,
    canAnalytics,
    canIntelListings,
    canPropertyView,
    canRootPropertiesView,
    canCollectionView,
    canAccountsView,
    canLeadsView,
    canClientsView,
    canReviewsView,
    canFaqView,
    canAgentMapView,
    canNotificationView,
  ] = await Promise.all([
    hasPermission(PERMISSIONS.manage.dashboardView),
    hasPermission(PERMISSIONS.manage.analyticsView),
    hasPermission(PERMISSIONS.manage.intelligenceListingsView),
    hasPermission(PERMISSIONS.manage.propertySelfView),
    hasPermission(PERMISSIONS.root.propertiesView),
    hasPermission(PERMISSIONS.manage.propertyCollectionSelfView),
    hasPermission(PERMISSIONS.manage.accountsView),
    hasPermission(PERMISSIONS.manage.selfLeadView),
    hasPermission(PERMISSIONS.manage.selfClientView),
    hasPermission(PERMISSIONS.manage.selfReviewsView),
    hasPermission(PERMISSIONS.manage.faqView),
    hasPermission(PERMISSIONS.manage.agentMapView),
    hasPermission(PERMISSIONS.manage.notificationView),
  ]);

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
          canLeadsView={canLeadsView}
          canClientsView={canClientsView}
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
