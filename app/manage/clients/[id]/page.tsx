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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <ClientLink href="/manage/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ChevronLeft className="h-4 w-4" /> Back to Clients
                </ClientLink>
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold">{client.firstName} {client.lastName}</h2>
                        <p className="text-sm text-muted-foreground mt-1">Client since {new Date(client.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{client.leads.length} lead{client.leads.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">

                {/* Left — contact info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
                    <div className="rounded-lg border divide-y overflow-hidden">
                        {[
                            { label: 'Phone',  value: contact?.phone  || '—' },
                            { label: 'Email',  value: contact?.email  || '—' },
                            { label: 'Source', value: client.source   || '—' },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex items-center px-4 py-3 gap-4">
                                <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
                                <span className="text-sm break-all">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right — leads */}
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Leads <span className="normal-case font-normal">({client.leads.length})</span>
                    </h3>

                    {client.leads.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No leads yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {client.leads.map((lead) => (
                                <div key={lead.id} className="rounded-lg border p-5 space-y-4">
                                    {/* Lead header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{lead.type}</Badge>
                                            <Badge variant="outline" className="capitalize">{lead.priority.toLowerCase()}</Badge>
                                            {lead.leadOwner && (
                                                <span className="text-xs text-muted-foreground">· {lead.leadOwner}</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString()}</span>
                                    </div>

                                    {/* Requirements */}
                                    {lead.requirement && Object.keys(lead.requirement as object).length > 0 && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {Object.entries(lead.requirement as Record<string, any>)
                                                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                                                .map(([k, v]) => (
                                                    <div key={k} className="rounded-md bg-muted/40 px-3 py-2">
                                                        <p className="text-[11px] text-muted-foreground capitalize mb-0.5">{k.replace(/([A-Z])/g, ' $1')}</p>
                                                        <p className="text-sm font-medium">{String(v)}</p>
                                                    </div>
                                                ))}
                                        </div>
                                    )}

                                    {/* Activity */}
                                    {lead.activities.length > 0 && (
                                        <div className="space-y-1 border-t pt-3">
                                            <p className="text-xs font-medium text-muted-foreground mb-2">Activity ({lead.activities.length})</p>
                                            {lead.activities.slice(0, 3).map((a) => (
                                                <div key={a.id} className="flex items-start gap-3 text-xs text-muted-foreground">
                                                    <span className="shrink-0 tabular-nums">{new Date(a.activityOn).toLocaleDateString()}</span>
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
        </div>
    );
}
