import { ServerProfileHeader } from './server-profile-header';
import { RequirementsSection } from './requirements-section';
import { requireAuth } from '@/services/auth';

export default async function ProfilePage() {
  // Single line - handles auth and redirects if not authenticated
  const account = await requireAuth();

  return (
    <div className="flex-1 bg-secondary/30">
      <ServerProfileHeader />
      <RequirementsSection accountId={account.aid} />
    </div>
  );
}
