import { notFound } from 'next/navigation';
import { getUnifiedClientById } from '@/services/lead-service';
import { ClientLink } from '@/components/client-link';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function BaseLeadClientPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const client = await getUnifiedClientById(id);

    if (!client) notFound();

    const contact = client.contact as any;

    return (
        <div className="space-y-6">
            <ClientLink href="/manage/leads/base" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" /> Back to Base Leads
            </ClientLink>

            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <div>
                        <h2 className="text-2xl font-semibold leading-none tracking-tight">
                            {client.firstName} {client.lastName}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {client.leads.length} lead{client.leads.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {contact?.phone && <span className="text-sm text-muted-foreground">{contact.phone}</span>}
                        {contact?.email && <span className="text-sm text-muted-foreground">{contact.email}</span>}
                        {client.source && <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">{client.source}</span>}
                    </div>
                </div>
                <ClientLink href="/manage/leads/shared/create">
                    <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        New Lead
                    </Button>
                </ClientLink>
            </div>

            <div className="space-y-3">
                {client.leads.map((lead) => {
                    const req = lead.requirement as Record<string, any> | null;
                    return (
                        <ClientLink
                            key={lead.id}
                            href={`/manage/leads/shared/${lead.id}/activity`}
                            className="block rounded-lg border border-border px-5 py-4 hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold">Lead</p>
                                        {lead.leadOwner && (
                                            <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">
                                                Owner: {lead.leadOwner}
                                            </span>
                                        )}
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
        </div>
    );
}
