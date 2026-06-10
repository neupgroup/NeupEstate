'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAgencyAgentMapAction } from '@/app/actions';
import type { Account } from '@/types';
import type { AgencyAgentMap } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/logica/core/hooks/use-toast';
import { Loader2, Link2, Search } from 'lucide-react';
import { cn } from '@/logica/core/utils';

type Props = {
  currentAccountId: string;
  agencies: Account[];
  initialLinks: AgencyAgentMap[];
};

function getAccountLabel(account: Account): string {
  return account.display_name || account.id;
}

export function AgentMapManager({ currentAccountId, agencies, initialLinks }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [agencySearch, setAgencySearch] = useState('');
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(
    initialLinks.find((link) => link.isPrimary)?.agencyId ?? initialLinks[0]?.agencyId ?? null,
  );
  const [isPrimary, setIsPrimary] = useState(false);

  const agencyMap = useMemo(() => new Map(agencies.map((agency) => [agency.id, agency])), [agencies]);

  const filteredAgencies = useMemo(() => {
    const query = agencySearch.trim().toLowerCase();
    if (!query) return agencies;

    return agencies.filter((agency) => {
      const haystack = [
        agency.id,
        agency.display_name ?? '',
        agency.display_image ?? '',
        agency.account_type,
      ].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [agencySearch, agencies]);

  async function handleAddAgency() {
    if (!selectedAgencyId) {
      toast({
        variant: 'destructive',
        title: 'Select an agency',
        description: 'Choose an agency before creating the link.',
      });
      return;
    }

    startTransition(async () => {
      const result = await createAgencyAgentMapAction({
        agencyId: selectedAgencyId,
        agentId: currentAccountId,
        isPrimary,
      });

      if (result.success) {
        toast({
          title: 'Agency linked',
          description: 'The agency-agent mapping was created successfully.',
        });
        router.refresh();
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Unable to create link',
        description: result.error || 'Failed to create the agency-agent mapping.',
      });
    });
  }

  const primaryLink = initialLinks.find((link) => link.isPrimary) ?? null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold leading-none tracking-tight">Agency Agent Map</h2>
        <p className="text-sm text-muted-foreground">
          Link agencies to the current agent account so property posting can default to an agency when one is available.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Link</CardTitle>
          <CardDescription>
            Search for an agency, select it, and create the mapping for your current agent account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Search agency</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={agencySearch}
                onChange={(event) => setAgencySearch(event.target.value)}
                placeholder="Type agency name or account ID"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {filteredAgencies.map((agency) => {
              const selected = selectedAgencyId === agency.id;
              return (
                <button
                  key={agency.id}
                  type="button"
                  onClick={() => setSelectedAgencyId(agency.id)}
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
            {filteredAgencies.length === 0 && (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground md:col-span-2">
                No agencies matched your search.
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4 md:flex-row md:items-center md:justify-between">
            <label className="flex items-center gap-3 text-sm">
              <Checkbox checked={isPrimary} onCheckedChange={(checked) => setIsPrimary(Boolean(checked))} />
              Set as primary agency for this agent
            </label>
            <Button type="button" onClick={handleAddAgency} disabled={isPending || !selectedAgencyId}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Add Agency Link
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Links</CardTitle>
          <CardDescription>
            {initialLinks.length} agency link{initialLinks.length === 1 ? '' : 's'} for this agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {initialLinks.length > 0 ? (
            initialLinks.map((link) => {
              const agency = agencyMap.get(link.agencyId);
              return (
                <div key={link.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="font-medium">{agency ? getAccountLabel(agency) : link.agencyId}</p>
                    <p className="text-xs text-muted-foreground">Agency ID: {link.agencyId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {link.isPrimary && <Badge variant="secondary">Primary</Badge>}
                    <Badge variant="outline">Agent: {currentAccountId}</Badge>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No agency links exist yet for this agent.</p>
          )}

          {primaryLink && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Properties will default to the primary agency unless you choose another one during posting.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
