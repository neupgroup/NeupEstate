import { ProfileHeader } from './profile-header';
import { getAuthenticatedMeData } from '@/services/auth/me';

export async function ServerProfileHeader() {
  const me = await getAuthenticatedMeData();

  return (
    <ProfileHeader
      displayName={me?.displayName ?? 'Guest Account'}
      displayImage={me?.displayImage ?? null}
      neupId={me?.neupId ?? null}
      verified={me?.registered ?? false}
    />
  );
}
