import { getMyLeads } from '@/services/leads/search';
import { checkAuthenticationForWeb, getAccountIdFromJWT } from '@/services/neupid/check-auth-web';
import { ClientLink } from '@/components/client-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';

export default async function MyLeadsPage() {
    await requirePagePermission(PERMISSIONS.manage.selfLeadView);
    await checkAuthenticationForWeb();
    const accountId = await getAccountIdFromJWT();
    const leads = accountId ? await getMyLeads(accountId) : [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold leading-none tracking-tight">My Leads</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {leads.length} lead{leads.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <ClientLink href="/manage/leads/add">
                    <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        New Lead
                    </Button>
                </ClientLink>
            </div>

            {leads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No leads assigned to you yet.</p>
            ) : (
                <div className="space-y-3">
                    {leads.map((lead) => {
                        const contact = lead.client.contact as any;
                        const req = lead.requirement as Record<string, any> | null;

                        return (
                            <ClientLink
                                key={lead.id}
                                href={`/manage/leads/shared/${lead.id}`}
                                className="block rounded-lg border border-border px-5 py-4 hover:border-primary hover:bg-primary/5 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <p className="font-semibold">{lead.client.firstName} {lead.client.lastName}</p>
                                        <div className="flex items-center gap-3 flex-wrap">
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
