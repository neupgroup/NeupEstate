import { requireAuth } from '@/services/auth';
import { TeamMemberForm } from '../team-member-form';

type SearchParams = Record<string, string | string[] | undefined>;

function getSelectedAgency(searchParams?: SearchParams) {
  const value = searchParams?.selectedAgency;
  return Array.isArray(value) ? value[0] : value?.trim() || null;
}

export default async function CreateTeamMemberPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // Require authentication
  await requireAuth();
  const selectedAgency = getSelectedAgency(searchParams);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold leading-none tracking-tight">
          Add Team Member
        </h2>
        <p className="text-sm text-muted-foreground">
          Create a new team member profile.
        </p>
      </div>

      <TeamMemberForm defaultOrgId={selectedAgency ?? undefined} />
    </div>
  );
}
