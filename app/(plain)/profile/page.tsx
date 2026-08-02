import { ServerProfileHeader } from './server-profile-header';
import { RequirementsSection } from './requirements-section';
import { requireAuth } from '@/services/auth';
import { GuestSigninBanner } from '@/components/layout/guest-signin-banner';
import { getAuthenticatedMeData } from '@/services/auth/me';

export default async function ProfilePage() {
  // Single line - handles auth and redirects if not authenticated
  const account = await requireAuth();
  const me = await getAuthenticatedMeData();
  const showGuestBanner = me?.guest === true;

  return (
    <div className="flex-1 bg-secondary/30">
      <ServerProfileHeader />
      {showGuestBanner && <GuestSigninBanner variant="inline" />}
      <RequirementsSection accountId={account.aid} />
    </div>
  );
}
