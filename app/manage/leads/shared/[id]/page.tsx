import { notFound } from 'next/navigation';
import { getLeadActivity } from '@/services/leads/activity/view';
import { getProperties } from '@/services/property-service';
import { ClientLink } from '@/components/client-link';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ActivityList } from '@/components/manage/activity-list';

export default async function SharedLeadPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [{ lead, activities }, properties] = await Promise.all([
        getLeadActivity(id),
        getProperties({ includeInactive: true }),
    ]);

    if (!lead) notFound();

    const client = lead.client as any;
    const serializedActivities = activities.map((activity) => ({
        ...activity,
        activityOn: activity.activityOn.toISOString(),
    }));
    const serializedProperties = properties.map((property) => ({
        id: property.id,
        title: property.title,
        location: property.location || null,
    }));

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

            <ActivityList activities={serializedActivities as any} leadId={lead.id} properties={serializedProperties} />
        </div>
    );
}
