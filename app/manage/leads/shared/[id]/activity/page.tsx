import { notFound } from 'next/navigation';
import { getLeadActivity } from '@/services/lead-service';
import { ClientLink } from '@/components/client-link';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ActivityList } from '@/components/manage/activity-list';

export default async function SharedLeadActivityPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { lead, activities } = await getLeadActivity(id);

    if (!lead) notFound();

    const client = lead.client as any;

    return (
        <div className="space-y-6">
            <div>
                <ClientLink href="/manage/leads/shared" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ChevronLeft className="h-4 w-4" /> Back to Shared Leads
                </ClientLink>
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-semibold">Lead Activity</h2>
                        <p className="text-sm text-muted-foreground mt-1">{activities.length} event{activities.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">{lead.type}</Badge>
                        <Badge variant="outline" className="capitalize">{lead.priority.toLowerCase()}</Badge>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                    {client?.firstName} {client?.lastName}
                    {client?.contact?.email ? ` · ${client.contact.email}` : ''}
                    {client?.contact?.phone ? ` · ${client.contact.phone}` : ''}
                </p>
            </div>

            <ActivityList activities={activities as any} />
        </div>
    );
}
