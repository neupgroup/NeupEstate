import { notFound } from 'next/navigation';
import { getClientById, getClientActivity } from '@/services/lead-service';
import { checkAuthenticationForWeb, getAccountIdFromJWT } from '@/services/neupid/check-auth-web';
import { ClientLink } from '@/components/client-link';
import { ChevronLeft } from 'lucide-react';
import { ActivityList } from '@/components/manage/activity-list';

export default async function ClientActivityPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await checkAuthenticationForWeb();
    const accountId = await getAccountIdFromJWT();

    const [client, { leads, activities }] = await Promise.all([
        getClientById(id, accountId!),
        getClientActivity(id),
    ]);

    if (!client) notFound();

    return (
        <div className="space-y-6">
            <div>
                <ClientLink href={`/manage/clients/${id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ChevronLeft className="h-4 w-4" /> {client.firstName} {client.lastName}
                </ClientLink>
                <h2 className="text-2xl font-semibold">Activity</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {activities.length} event{activities.length !== 1 ? 's' : ''} across {leads.length} lead{leads.length !== 1 ? 's' : ''}
                </p>
            </div>

            <ActivityList activities={activities as any} leads={leads as any} showLead />
        </div>
    );
}
