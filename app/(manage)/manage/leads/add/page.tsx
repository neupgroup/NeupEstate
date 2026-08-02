import { requirePagePermission } from '@/services/permissions';
import { PERMISSIONS } from '@/services/permissions';
import { checkAuthenticationForWeb } from '@/services/neupid/check-auth-web';
import { CreateLeadForm } from '@/components/manage/create-lead-form';
import { ClientLink } from '@/components/client-link';
import { ChevronLeft } from 'lucide-react';

export default async function AddLeadPage() {
    await requirePagePermission(PERMISSIONS.manage.selfLeadView);
    await checkAuthenticationForWeb();

    return (
        <div className="space-y-6">
            <ClientLink
                href="/manage/leads"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
                <ChevronLeft className="h-4 w-4" /> Back to Leads
            </ClientLink>
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Add Lead</h2>
                <p className="text-sm text-muted-foreground mt-1">Create a new lead from the unified CRM pipeline.</p>
            </div>
            <CreateLeadForm />
        </div>
    );
}
