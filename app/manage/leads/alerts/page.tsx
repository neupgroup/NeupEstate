import { getSharedLeads } from '@/services/lead-service';
import { checkAuthenticationForWeb } from '@/services/neupid/check-auth-web';
import { ClientLink } from '@/components/client-link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, ChevronRight } from 'lucide-react';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';

export default async function LeadAlertsPage() {
    await requirePagePermission(PERMISSIONS.manage.selfLeadView);
    await checkAuthenticationForWeb();
    const leads = await getSharedLeads();
    const alerts = leads.filter((lead) => ['HIGH', 'URGENT'].includes(String(lead.priority)) || !lead.leadOwner);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold leading-none tracking-tight">Lead Alerts</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <ClientLink href="/manage/leads/add">
                    <Button size="sm" variant="outline">
                        <Bell className="h-4 w-4 mr-1" />
                        New Lead
                    </Button>
                </ClientLink>
            </div>

            {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No urgent leads right now.</p>
            ) : (
                <div className="space-y-3">
                    {alerts.map((lead) => {
                        const contact = lead.client.contact as any;
                        return (
                            <ClientLink
                                key={lead.id}
                                href={`/manage/leads/shared/${lead.id}`}
                                className="block rounded-lg border border-border px-5 py-4 hover:border-primary hover:bg-primary/5 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <p className="font-semibold">{lead.client.firstName} {lead.client.lastName}</p>
                                            <Badge variant="outline">{lead.type}</Badge>
                                            <Badge variant="outline" className="capitalize">{lead.priority.toLowerCase()}</Badge>
                                            {!lead.leadOwner && <Badge variant="outline">Unassigned</Badge>}
                                        </div>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {contact?.phone && <span className="text-sm text-muted-foreground">{contact.phone}</span>}
                                            {contact?.email && <span className="text-sm text-muted-foreground">{contact.email}</span>}
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                                </div>
                            </ClientLink>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
