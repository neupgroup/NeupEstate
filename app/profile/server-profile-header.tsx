import { ProfileHeader } from './profile-header';
import { getAuthenticatedMeData } from '@/services/auth/me';

export async function ServerProfileHeader() {
  const me = await getAuthenticatedMeData();

  return (
    <ProfileHeader
      displayName={me?.displayName ?? 'User'}
      displayImage={me?.displayImage ?? null}
      neupId={me?.neupId ?? null}
      verified={me?.registered ?? false}
      accountType={me?.accountType ?? null}
    />
  );
}
