import { getClients } from '@/services/lead-service';
import { ClientLink } from '@/components/client-link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default async function ClientsPage() {
    const clients = await getClients();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold leading-none tracking-tight">Clients</h2>
                    <p className="text-sm text-muted-foreground mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
                </div>
                <ClientLink href="/manage/leads/create">
                    <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Lead</Button>
                </ClientLink>
            </div>

            {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No clients yet. Create a lead to add one.</p>
            ) : (
                <div className="space-y-3">
                    {clients.map((c) => (
                        <ClientLink key={c.id} href={`/manage/clients/${c.id}`} className="block rounded-lg border border-border px-5 py-4 hover:border-primary hover:bg-primary/5 transition-colors">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold">{c.firstName} {c.lastName}</p>
                                <span className="text-xs text-muted-foreground">{c.leads.length} lead{c.leads.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                                {(c.contact as any)?.phone && <span className="text-sm text-muted-foreground">{(c.contact as any).phone}</span>}
                                {(c.contact as any)?.email && <span className="text-sm text-muted-foreground">{(c.contact as any).email}</span>}
                                {c.source && <span className="text-xs text-muted-foreground border border-border rounded-full px-2 py-0.5">{c.source}</span>}
                            </div>
                        </ClientLink>
                    ))}
                </div>
            )}
        </div>
    );
}
