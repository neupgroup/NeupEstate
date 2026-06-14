import { getMyLeads, getUnifiedLeads } from '@/services/lead-service';
import { checkAuthenticationForWeb, getAccountIdFromJWT } from '@/services/neupid/check-auth-web';
import { ClientLink } from '@/components/client-link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Flame, Users, Bell, Home } from 'lucide-react';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';

export default async function LeadsHomePage() {
    await requirePagePermission(PERMISSIONS.manage.selfLeadView);
    await checkAuthenticationForWeb();
    const accountId = await getAccountIdFromJWT();
    const [baseLeads, myLeads] = await Promise.all([
        getUnifiedLeads(),
        accountId ? getMyLeads(accountId) : Promise.resolve([]),
    ]);

    const cards = [
        { href: '/manage/leads/base', title: 'Base Leads', description: 'All leads grouped from the current lead table.', count: baseLeads.length, icon: Flame },
        { href: '/manage/leads/my', title: 'My Leads', description: 'Leads assigned to your account.', count: myLeads.length, icon: Users },
        { href: '/manage/leads/shared', title: 'Shared Leads', description: 'Lead activity and shared lead records.', count: baseLeads.length, icon: Users },
        { href: '/manage/leads/alerts', title: 'Alerts', description: 'Priority leads and follow-ups that need attention.', count: baseLeads.filter((lead) => ['HIGH', 'URGENT'].includes(String(lead.priority))).length, icon: Bell },
    ] as const;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold leading-none tracking-tight">Leads</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {baseLeads.length} base lead{baseLeads.length !== 1 ? 's' : ''} · {myLeads.length} my lead{myLeads.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <ClientLink href="/manage/leads/add">
                        <Button size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            New Lead
                        </Button>
                    </ClientLink>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <ClientLink
                            key={card.href}
                            href={card.href}
                            className="rounded-xl border border-border bg-card/40 p-5 hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-primary" />
                                        <h3 className="font-semibold">{card.title}</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{card.description}</p>
                                </div>
                                <Badge variant="outline">{card.count}</Badge>
                            </div>
                        </ClientLink>
                    );
                })}
            </div>

            <div className="rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Home className="h-4 w-4" />
                    Quick links
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <ClientLink href="/manage/leads/base" className="rounded-lg border border-border px-4 py-3 hover:border-primary hover:bg-primary/5 transition-colors">
                        Base Leads
                    </ClientLink>
                    <ClientLink href="/manage/leads/my" className="rounded-lg border border-border px-4 py-3 hover:border-primary hover:bg-primary/5 transition-colors">
                        My Leads
                    </ClientLink>
                    <ClientLink href="/manage/leads/shared" className="rounded-lg border border-border px-4 py-3 hover:border-primary hover:bg-primary/5 transition-colors">
                        Shared Leads
                    </ClientLink>
                    <ClientLink href="/manage/leads/alerts" className="rounded-lg border border-border px-4 py-3 hover:border-primary hover:bg-primary/5 transition-colors">
                        Alerts
                    </ClientLink>
                </div>
            </div>
        </div>
    );
}
