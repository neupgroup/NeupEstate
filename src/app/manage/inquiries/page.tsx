
import { getInquiries } from '@/services/inquiry-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { ClientLink } from '@/components/client-link';
import { RelativeTime } from '@/components/manage/relative-time';
import { InquiryStatusUpdater } from '@/components/manage/inquiry-status-updater';

export default async function InquiriesPage() {
    const inquiries = await getInquiries();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">
                    Property Inquiries
                </h2>
                <p className="text-sm text-muted-foreground">
                    {inquiries.length} {inquiries.length === 1 ? 'inquiry' : 'inquiries'} received. Newest first.
                </p>
            </div>
            <div>
                {inquiries.length > 0 ? (
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Property</TableHead>
                                <TableHead>Question</TableHead>
                                <TableHead>Submitted By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {inquiries.map((inquiry) => (
                                <TableRow key={inquiry.id}>
                                    <TableCell>
                                        <ClientLink href={`/manage/properties/${inquiry.propertyId}/edit`} className="font-medium hover:underline block truncate max-w-xs">
                                            {inquiry.propertyTitle}
                                        </ClientLink>
                                        <span className="text-xs text-muted-foreground">Agent: {inquiry.agentName}</span>
                                    </TableCell>
                                    <TableCell className="max-w-md">
                                        <p className="whitespace-pre-wrap">{inquiry.question}</p>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium">{inquiry.name}</p>
                                        <p className="text-sm text-muted-foreground">{inquiry.email}</p>
                                        {inquiry.phone && <p className="text-sm text-muted-foreground">{inquiry.phone}</p>}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        <RelativeTime timestamp={inquiry.createdAt} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <InquiryStatusUpdater inquiryId={inquiry.id} currentStatus={inquiry.status} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No Inquiries Found</AlertTitle>
                        <AlertDescription>
                            No users have submitted questions about properties yet.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
