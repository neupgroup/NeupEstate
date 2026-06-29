import { getBaseLeads } from '@/services/lead-service';
import { checkAuthenticationForWeb } from '@/services/neupid/check-auth-web';
import { getAccountIdFromJWT } from '@/services/neupid/check-auth-web';
import { getAccountById } from '@/services/account-service';
import { getAgencyAgentMapsByAgent } from '@/services/agency-agent-map-service';
import { ClientLink } from '@/components/client-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function BaseLeadsPage() {
    await checkAuthenticationForWeb();
    const accountId = await getAccountIdFromJWT();
    const account = accountId ? await getAccountById(accountId) : null;
    const agencyLinks = accountId ? await getAgencyAgentMapsByAgent(accountId) : [];
    const canViewAllLeads =
        ['brand', 'brand.agency', 'subbrand', 'subbrand.agency'].includes(account?.account_type ?? '') ||
        agencyLinks.some((link) => link.status === 'accepted' && link.isAdmin);
    const leads = await getBaseLeads();
    const visibleLeads = canViewAllLeads || !accountId
        ? leads
        : leads.filter((lead) => lead.leadOwner === accountId);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold leading-none tracking-tight">Base Leads</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {visibleLeads.length} lead{visibleLeads.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <ClientLink href="/manage/leads/add">
                    <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        New Lead
                    </Button>
                </ClientLink>
            </div>

            {visibleLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No leads yet.</p>
            ) : (
                <div className="space-y-3">
                    {visibleLeads.map((lead) => {
                        const contact = lead.client.contact as any;
                        const req = lead.requirement as Record<string, any> | null;

                        return (
                            <ClientLink
                                key={lead.id}
                                href={`/manage/leads/base/${lead.client.id}`}
                                className="block rounded-lg border border-border px-5 py-4 hover:border-primary hover:bg-primary/5 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <p className="font-semibold">
                                                {lead.client.firstName} {lead.client.lastName}
                                            </p>
                                            {lead.leadOwner && (
                                                <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
                                                    Owner: {lead.leadOwner}
                                                </span>
                                            )}
                                            {lead.client.source && (
                                                <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
                                                    {lead.client.source}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {contact?.phone && <span className="text-sm text-muted-foreground">{contact.phone}</span>}
                                            {contact?.email && <span className="text-sm text-muted-foreground">{contact.email}</span>}
                                        </div>
                                        {req && (req.location || req.minBudget || req.maxBudget || req.notes) && (
                                            <p className="text-xs text-muted-foreground">
                                                {[
                                                    req.location,
                                                    req.minBudget && req.maxBudget
                                                        ? `${req.minBudget.toLocaleString()} – ${req.maxBudget.toLocaleString()}`
                                                        : req.minBudget
                                                          ? `From ${req.minBudget.toLocaleString()}`
                                                          : req.maxBudget
                                                            ? `Up to ${req.maxBudget.toLocaleString()}`
                                                            : null,
                                                    req.notes,
                                                ].filter(Boolean).join(' · ')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant="outline">{lead.type}</Badge>
                                        <Badge variant="outline" className="capitalize">{lead.priority.toLowerCase()}</Badge>
                                    </div>
                                </div>
                            </ClientLink>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
