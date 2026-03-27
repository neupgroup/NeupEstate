
import { getAccountById } from '@/services/account-service';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Target } from 'lucide-react';

export default async function UserRequirementsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const account = await getAccountById(id);

    if (!account) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target />
                        User Requirements
                    </CardTitle>
                    <CardDescription>
                        Viewing requirements for user ID: {account.id}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Feature Coming Soon</AlertTitle>
                        <AlertDescription>
                            This page will soon display all saved property requirements for this user.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}
