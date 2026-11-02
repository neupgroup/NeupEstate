import { redirect } from 'next/navigation';
import { requireAuth } from '@/services/auth/account';
import { getAuthenticatedMeData } from '@/services/auth/me';

/** Redirect the legacy profile route to the signed-in user's public profile. */
export default async function ProfilePage() {
  await requireAuth();
  const me = await getAuthenticatedMeData();
  const neupId = me?.neupId?.trim();

  if (!neupId) redirect('/home');
  redirect(`/@${encodeURIComponent(neupId)}`);
}
