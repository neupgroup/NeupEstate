
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function SupportPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">
                    Support Center
                </h2>
                <p className="text-sm text-muted-foreground">
                    Get help and find resources.
                </p>
            </div>
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Coming Soon</AlertTitle>
                <AlertDescription>
                    This page is under construction. Support documentation, FAQs, and contact forms will be available here in a future update.
                </AlertDescription>
            </Alert>
        </div>
    );
}
