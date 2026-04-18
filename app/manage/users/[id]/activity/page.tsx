
import { getAccountById } from '@/services/account-service';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, List } from 'lucide-react';

export default async function UserActivityPage({ params }: { params: Promise<{ id: string }> }) {
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
                        <List />
                        User Activity
                    </CardTitle>
                    <CardDescription>
                        Viewing activity for user ID: {account.id}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Paginated Activity View Coming Soon</AlertTitle>
                        <AlertDescription>
                            This page will soon display a full, paginated list of all actions this user has taken on the site. This requires implementing a full event logging service.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}
