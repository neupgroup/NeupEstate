import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientLink } from '@/components/client-link';

export type AgencyInvitationItem = {
  id: string;
  agencyId: string;
  agencyName: string;
};

type Props = {
  invitations: AgencyInvitationItem[];
};

export function AgencyInvitationsCard({ invitations }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agency Invitations</CardTitle>
        <CardDescription>
          Invitations sent to your account. Open the agent map page to review the full list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.length > 0 ? (
          invitations.map((invitation) => (
            <div key={invitation.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{invitation.agencyName}</p>
                <p className="truncate text-xs text-muted-foreground">{invitation.agencyId}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Invited</Badge>
                <ClientLink href="/manage/agentmap" className="text-sm text-primary hover:underline">
                  Review
                </ClientLink>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
            No agency invitations yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
