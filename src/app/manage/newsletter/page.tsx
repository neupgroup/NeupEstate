import { getNewsletterSubscriptions } from '@/services/newsletter-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Newspaper } from 'lucide-react';
import { RelativeTime } from '@/components/manage/relative-time';

export default async function ManageNewsletterPage() {
    const subscriptions = await getNewsletterSubscriptions();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Newspaper />
                    Newsletter Subscribers
                </CardTitle>
                <CardDescription>
                    {subscriptions.length} {subscriptions.length === 1 ? 'person has' : 'people have'} subscribed to your newsletter.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {subscriptions.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Email Address</TableHead>
                                <TableHead className="text-right">Subscribed On</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subscriptions.map(sub => (
                                <TableRow key={sub.id}>
                                    <TableCell className="font-medium">{sub.email}</TableCell>
                                    <TableCell className="text-right">
                                        <RelativeTime timestamp={sub.createdAt} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>No Subscribers Yet</AlertTitle>
                        <AlertDescription>
                            Your newsletter subscription form has not received any submissions.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
