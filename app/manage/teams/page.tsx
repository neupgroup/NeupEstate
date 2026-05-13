import { requireAuth } from '@/services/auth';
import { getTeamMembers } from '@/services/team-service';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus, AlertCircle, UserCheck, UserX } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ClientLink } from '@/components/client-link';

function getInitials(name: string) {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default async function ManageTeamsPage() {
  // Require authentication
  await requireAuth();

  const teamMembers = await getTeamMembers();

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">
            Team Management
          </h2>
          <p className="text-sm text-muted-foreground">
            {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''} found.
          </p>
        </div>
        <ClientLink href="/manage/teams/create" className={buttonVariants()}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Team Member
        </ClientLink>
      </div>

      <div>
        {teamMembers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.photoUrl || undefined} alt={member.name} />
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <ClientLink
                          href={`/manage/teams/${member.id}/edit`}
                          className="hover:underline"
                        >
                          {member.name}
                        </ClientLink>
                        {member.slug && (
                          <span className="text-xs text-muted-foreground">@{member.slug}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{member.position}</TableCell>
                  <TableCell>
                    <Badge variant={member.registered ? 'default' : 'secondary'}>
                      {member.registered ? (
                        <UserCheck className="mr-2 h-3 w-3" />
                      ) : (
                        <UserX className="mr-2 h-3 w-3" />
                      )}
                      {member.registered ? 'Registered' : 'Manual'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.orgId ? (
                      <span className="text-sm">{member.orgId}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Team Members Found</AlertTitle>
            <AlertDescription>
              No team members were found in the database. You can add one by clicking the button
              above.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
