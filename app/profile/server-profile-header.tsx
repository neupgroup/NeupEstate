import { ProfileHeader } from './profile-header';
import { getAuthenticatedMeData } from '@/services/auth/me';

export async function ServerProfileHeader() {
  const me = await getAuthenticatedMeData();
  console.log('[profile.header.me]', {
    hasMe: Boolean(me),
    accountId: me?.accountId,
    neupId: me?.neupId,
    displayName: me?.displayName,
    hasDisplayImage: Boolean(me?.displayImage),
    registered: me?.registered,
  });

  return (
    <ProfileHeader
      displayName={me?.displayName ?? 'Guest Account'}
      displayImage={me?.displayImage ?? null}
      neupId={me?.neupId ?? null}
      verified={me?.registered ?? false}
    />
  );
}
