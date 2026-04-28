import { CreateLeadForm } from '@/components/manage/create-lead-form';
import { ClientLink } from '@/components/client-link';
import { ChevronLeft } from 'lucide-react';

export default function CreateLeadPage() {
    return (
        <div className="space-y-6">
            <div>
                <ClientLink
                    href="/manage/leads"
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
                >
                    <ChevronLeft className="h-4 w-4" /> Back to Leads
                </ClientLink>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">New Lead</h2>
                <p className="text-sm text-muted-foreground mt-1">Add a client and their requirements.</p>
            </div>
            <CreateLeadForm />
        </div>
    );
}
