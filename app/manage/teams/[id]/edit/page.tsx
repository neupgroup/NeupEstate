import { requireAuth } from '@/services/auth';
import { getTeamMemberById } from '@/services/team-service';
import { notFound } from 'next/navigation';
import { TeamMemberForm } from '../../team-member-form';

export default async function EditTeamMemberPage({
  params,
}: {
  params: { id: string };
}) {
  // Require authentication
  await requireAuth();

  const teamMember = await getTeamMemberById(params.id);

  if (!teamMember) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold leading-none tracking-tight">
          Edit Team Member
        </h2>
        <p className="text-sm text-muted-foreground">
          Update {teamMember.name}'s profile.
        </p>
      </div>

      <TeamMemberForm teamMember={teamMember} />
    </div>
  );
}
