'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAgencyAgentMapAction } from '@/app/actions';
import type { Account, AgencyAgentMap } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/logica/core/hooks/use-toast';
import { Loader2, Link2, Search, Users } from 'lucide-react';
import { cn } from '@/logica/core/utils';

type Props = {
  agencies: Account[];
  accounts: Account[];
  initialLinks: AgencyAgentMap[];
  selectedAgencyId: string | null;
};

function getAccountLabel(account: Account): string {
  return account.display_name || account.id;
}

function isBrandAccount(account: Account): boolean {
  return account.account_type === 'brand';
}

export function AgentMapManager({
  agencies,
  accounts,
  initialLinks,
  selectedAgencyId,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showSearch, setShowSearch] = useState(false);
  const [agentSearch, setAgentSearch] = useState('');

  const agencyMap = useMemo(() => new Map(agencies.map((agency) => [agency.id, agency])), [agencies]);
  const linkedAgentIds = useMemo(() => new Set(initialLinks.map((link) => link.agentId)), [initialLinks]);

  const selectedAgency = selectedAgencyId ? agencyMap.get(selectedAgencyId) ?? null : null;

  const availableAgents = useMemo(() => {
    return accounts.filter((account) => !isBrandAccount(account) && !linkedAgentIds.has(account.id));
  }, [accounts, linkedAgentIds]);

  const filteredAgents = useMemo(() => {
    const query = agentSearch.trim().toLowerCase();
    if (!query || !showSearch) return [];

    return availableAgents.filter((account) => {
      const haystack = [
        account.id,
        account.display_name ?? '',
        account.display_image ?? '',
        account.account_type,
      ].join(' ').toLowerCase();

      return haystack.includes(query);
    });
  }, [agentSearch, availableAgents, showSearch]);

  async function handleInvite(agentId: string) {
    if (!selectedAgencyId) {
      toast({
        variant: 'destructive',
        title: 'Select an agency',
        description: 'Choose the agency before inviting an agent.',
      });
      return;
    }

    startTransition(async () => {
      const result = await createAgencyAgentMapAction({
        agencyId: selectedAgencyId,
        agentId,
      });

      if (result.success) {
        toast({
          title: 'Invitation sent',
          description: 'The agent will see the invitation on their dashboard.',
        });
        setAgentSearch('');
        setShowSearch(false);
        router.refresh();
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Unable to invite agent',
        description: result.error || 'Failed to send the invitation.',
      });
    });
  }

  function updateSelectedAgency(nextAgencyId: string) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('selectedAgency', nextAgencyId);
    router.replace(`${nextUrl.pathname}${nextUrl.search}`);
    setShowSearch(false);
    setAgentSearch('');
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold leading-none tracking-tight">Agency Agent Map</h2>
        <p className="text-sm text-muted-foreground">
          Pick an agency, review the invited agents, and send new invitations from the same place.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Agency</CardTitle>
          <CardDescription>Switch the agency context before inviting or reviewing agents.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {agencies.map((agency) => {
            const selected = agency.id === selectedAgencyId;
            return (
              <button
                key={agency.id}
                type="button"
                onClick={() => updateSelectedAgency(agency.id)}
                className={cn(
                  'rounded-lg border px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5',
                  selected ? 'border-primary bg-primary/10' : 'border-border bg-background',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{getAccountLabel(agency)}</p>
                    <p className="truncate text-xs text-muted-foreground">{agency.id}</p>
                  </div>
                  {selected && <Badge>Selected</Badge>}
                </div>
              </button>
            );
          })}
          {agencies.length === 0 && (
            <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground md:col-span-2 lg:col-span-3">
              No agencies found for this account.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invited Agents</CardTitle>
          <CardDescription>
            {selectedAgency
              ? `Agents already invited to ${getAccountLabel(selectedAgency)}.`
              : 'Select an agency to view its invited agents.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedAgencyId ? (
            initialLinks.length > 0 ? (
              initialLinks.map((link) => {
                const agent = accounts.find((account) => account.id === link.agentId);
                return (
                  <div key={link.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">{agent ? getAccountLabel(agent) : link.agentId}</p>
                      <p className="truncate text-xs text-muted-foreground">Agent ID: {link.agentId}</p>
                    </div>
                    <Badge variant="secondary">Invited</Badge>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
                No agents have been invited yet.
              </div>
            )
          ) : (
            <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
              Choose an agency to review invitations.
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
            <div className="min-w-0">
              <p className="font-medium">Invite another agent</p>
              <p className="text-sm text-muted-foreground">
                Search the directory and invite people who are not yet in this agency.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={() => setShowSearch((value) => !value)} disabled={!selectedAgencyId}>
              <Link2 className="mr-2 h-4 w-4" />
              {showSearch ? 'Hide search' : 'Add agent'}
            </Button>
          </div>

          {showSearch && selectedAgencyId && (
            <div className="space-y-3 rounded-lg border bg-card p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={agentSearch}
                  onChange={(event) => setAgentSearch(event.target.value)}
                  placeholder="Search agent name or ID"
                  className="pl-9"
                />
              </div>

              {agentSearch.trim() ? (
                <div className="space-y-2">
                  {filteredAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{getAccountLabel(agent)}</p>
                        <p className="truncate text-xs text-muted-foreground">{agent.id}</p>
                      </div>
                      <Button type="button" onClick={() => handleInvite(agent.id)} disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                        Invite
                      </Button>
                    </div>
                  ))}

                  {filteredAgents.length === 0 && (
                    <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                      No agents matched your search, or they are already invited to this agency.
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Start typing to see agents that are not yet part of this agency.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
