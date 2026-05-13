import { requireAuth } from '@/services/auth';
import { TeamMemberForm } from '../team-member-form';

export default async function CreateTeamMemberPage() {
  // Require authentication
  await requireAuth();

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

      <TeamMemberForm />
    </div>
  );
}
