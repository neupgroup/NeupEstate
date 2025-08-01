import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell } from 'lucide-react';

export default function NotificationsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">
                    Notifications Center
                </h2>
                <p className="text-sm text-muted-foreground">
                    Manage and send notifications to your users.
                </p>
            </div>
            <Alert>
                <Bell className="h-4 w-4" />
                <AlertTitle>Feature Coming Soon</AlertTitle>
                <AlertDescription>
                    The notifications system with role-based sending rules is currently under construction. This page will be updated in the future.
                </AlertDescription>
            </Alert>
        </div>
    );
}
