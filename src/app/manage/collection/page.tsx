
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function CollectionPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">
                   Property Collections
                </h2>
                <p className="text-sm text-muted-foreground">
                    Manage and curate collections of properties.
                </p>
            </div>
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Coming Soon</AlertTitle>
                <AlertDescription>
                    This page is under construction. You will be able to create and manage property collections from here in a future update.
                </AlertDescription>
            </Alert>
        </div>
    );
}
