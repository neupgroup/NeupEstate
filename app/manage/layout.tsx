import { getAuthenticatedMeData } from '@/services/auth/me';
import { getManageLayoutPermissionState } from '@/services/permissions';
import { ManageLayoutClient } from './layout.client';

// Load management permissions and profile data for the client layout.
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
    canLeadsHomeView,
    canLeadsBaseView,
    canLeadsMyView,
    canLeadsSharedView,
    canLeadsAlertsView,
    canReviewsView,
    canNotificationView,
  } = await getManageLayoutPermissionState();
  const user = await getAuthenticatedMeData();

  const permissions = {
    '/manage': canDashboard,
    '/manage/analytics': canAnalytics,
    '/manage/intelligence': canIntelListings,
    '/manage/properties': canPropertyView || canRootPropertiesView,
    '/manage/collection': canCollectionView,
    '/manage/leads': canLeadsHomeView,
    '/manage/leads/add': canLeadsHomeView,
    '/manage/leads/base': canLeadsBaseView,
    '/manage/leads/my': canLeadsMyView,
    '/manage/leads/shared': canLeadsSharedView,
    '/manage/leads/alerts': canLeadsAlertsView,
    '/manage/reviews': canReviewsView,
    '/manage/notifications': canNotificationView,
  };

  return (
    <ManageLayoutClient
      permissions={permissions}
      profile={{
        displayName: user?.displayName ?? null,
        displayImage: user?.displayImage ?? null,
        neupId: user?.neupId ?? null,
        workingProfile: user?.workingProfile ?? null,
      }}
    >
      {children}
    </ManageLayoutClient>
  );
}
