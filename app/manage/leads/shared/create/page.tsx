import { CreateLeadForm } from '@/components/manage/create-lead-form';
import { ClientLink } from '@/components/client-link';
import { ChevronLeft } from 'lucide-react';

export default function SharedLeadCreatePage() {
    return (
        <div className="space-y-6">
            <ClientLink
                href="/manage/leads/shared"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
                <ChevronLeft className="h-4 w-4" /> Back to Shared Leads
            </ClientLink>
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">New Lead</h2>
                <p className="text-sm text-muted-foreground mt-1">Create a new lead and related client record.</p>
            </div>
            <CreateLeadForm />
        </div>
    );
}
