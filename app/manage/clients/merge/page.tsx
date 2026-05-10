import { getClients } from '@/services/lead-service';
import { checkAuthenticationForWeb, getAccountIdFromJWT } from '@/services/neupid/check-auth-web';
import { ClientLink } from '@/components/client-link';
import { ChevronLeft } from 'lucide-react';
import { MergeClientsForm } from '@/components/manage/merge-clients-form';

export default async function MergeClientsPage() {
    await checkAuthenticationForWeb();
    const accountId = await getAccountIdFromJWT();
    const clients = await getClients(accountId!);

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <ClientLink href="/manage/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ChevronLeft className="h-4 w-4" /> Back to Clients
                </ClientLink>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Merge Clients</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Select two clients to merge. All leads from the dropped client will be moved to the kept client.
                </p>
            </div>

            <MergeClientsForm clients={clients as any} />
        </div>
    );
}
