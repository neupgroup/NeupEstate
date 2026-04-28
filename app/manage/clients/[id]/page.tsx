import { notFound } from 'next/navigation';
import { getClientById } from '@/services/lead-service';
import { ClientLink } from '@/components/client-link';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const client = await getClientById(id);

    if (!client) notFound();

    const contact = client.contact as any;

    return (
        <div className="max-w-3xl space-y-8">
            <div>
                <ClientLink href="/manage/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ChevronLeft className="h-4 w-4" /> Back to Clients
                </ClientLink>
                <h2 className="text-2xl font-semibold">{client.firstName} {client.lastName}</h2>
                <p className="text-sm text-muted-foreground mt-1">Client since {new Date(client.createdAt).toLocaleDateString()}</p>
            </div>

            {/* Contact info */}
            <div className="rounded-lg border divide-y overflow-hidden">
                {[
                    { label: 'Phone',  value: contact?.phone || '—' },
                    { label: 'Email',  value: contact?.email || '—' },
                    { label: 'Source', value: client.source || '—' },
                ].map(({ label, value }) => (
                    <div key={label} className="flex items-center px-4 py-3 gap-4">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
                        <span className="text-sm">{value}</span>
                    </div>
                ))}
            </div>

            {/* Leads */}
            <div className="space-y-3">
                <h3 className="text-base font-semibold">Leads <span className="text-muted-foreground font-normal text-sm">({client.leads.length})</span></h3>

                {client.leads.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No leads yet.</p>
                ) : (
                    <div className="space-y-3">
                        {client.leads.map((lead) => (
                            <div key={lead.id} className="rounded-lg border p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{lead.type}</Badge>
                                        <Badge variant="outline" className="capitalize">{lead.priority.toLowerCase()}</Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</span>
                                </div>

                                {lead.requirement && Object.keys(lead.requirement as object).length > 0 && (
                                    <div className="rounded-md bg-muted/40 divide-y divide-border overflow-hidden">
                                        {Object.entries(lead.requirement as Record<string, any>)
                                            .filter(([, v]) => v !== null && v !== undefined && v !== '')
                                            .map(([k, v]) => (
                                                <div key={k} className="flex items-center px-3 py-2 gap-4">
                                                    <span className="text-xs text-muted-foreground w-24 shrink-0 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                                    <span className="text-xs">{String(v)}</span>
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {lead.leadOwner && (
                                    <p className="text-xs text-muted-foreground">Owner: {lead.leadOwner}</p>
                                )}

                                {lead.activities.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground">Activity ({lead.activities.length})</p>
                                        {lead.activities.slice(0, 3).map((a) => (
                                            <div key={a.id} className="flex items-start gap-3 text-xs text-muted-foreground">
                                                <span className="shrink-0">{new Date(a.activityOn).toLocaleDateString()}</span>
                                                <span>{JSON.stringify(a.data)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
