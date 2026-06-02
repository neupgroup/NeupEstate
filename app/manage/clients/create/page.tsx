import { CreateClientForm } from '@/components/manage/create-client-form';
import { ClientLink } from '@/components/client-link';
import { ChevronLeft } from 'lucide-react';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';

export default async function CreateClientPage() {
    await requirePagePermission(PERMISSIONS.manage.selfClientView);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <ClientLink
                    href="/manage/clients"
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                    <ChevronLeft className="h-4 w-4" /> Back to Clients
                </ClientLink>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">New Client</h2>
                <p className="text-sm text-muted-foreground mt-1">Create a client contact without creating a lead.</p>
            </div>
            <CreateClientForm />
        </div>
    );
}
