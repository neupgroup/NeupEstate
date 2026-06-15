'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { acceptAgencyAgentMapAction } from '@/app/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/logica/core/hooks/use-toast';

export type AgencyInvitationItem = {
  id: string;
  agencyId: string;
  agencyName: string;
  isAdmin: boolean;
};

type Props = {
  invitations: AgencyInvitationItem[];
};

export function AgencyInvitationsCard({ invitations }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function acceptInvitation(invitationId: string) {
    startTransition(async () => {
      const result = await acceptAgencyAgentMapAction(invitationId);
      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Unable to accept invitation',
          description: result.error || 'Please try again.',
        });
        return;
      }

      toast({
        title: 'Invitation accepted',
        description: 'You can now use the agency tools that were granted to you.',
      });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agency Invitations</CardTitle>
        <CardDescription>
          Invitations sent to your account. Accept an invitation to activate access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.length > 0 ? (
          invitations.map((invitation) => (
            <div key={invitation.id} className="flex items-center justify-between rounded-lg border px-4 py-3 gap-3">
              <div className="min-w-0">
                <p className="font-medium">{invitation.agencyName}</p>
                <p className="truncate text-xs text-muted-foreground">{invitation.agencyId}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Invited</Badge>
                {invitation.isAdmin && <Badge>Admin</Badge>}
                <Button type="button" size="sm" variant="outline" onClick={() => acceptInvitation(invitation.id)} disabled={isPending}>
                  Accept
                </Button>
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
