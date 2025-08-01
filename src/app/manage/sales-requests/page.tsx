
import { getSalesRequests } from '@/services/sales-request-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, User, MapPin, Home } from 'lucide-react';
import { RelativeTime } from '@/components/manage/relative-time';
import { Badge } from '@/components/ui/badge';

export default async function SalesRequestsPage() {
    const requests = await getSalesRequests();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">
                    Sales Requests
                </h2>
                <p className="text-sm text-muted-foreground">
                    {requests.length} {requests.length === 1 ? 'request' : 'requests'} received from potential sellers.
                </p>
            </div>
            <div>
                {requests.length > 0 ? (
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Property Details</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="text-sm text-muted-foreground">
                                        <RelativeTime timestamp={req.createdAt} />
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium flex items-center gap-2"><User className="h-3 w-3" />{req.name}</div>
                                        <div className="text-sm text-muted-foreground">{req.email}</div>
                                        {req.phone && <div className="text-sm text-muted-foreground">{req.phone}</div>}
                                    </TableCell>
                                    <TableCell className="max-w-md">
                                        <div className="flex flex-col gap-1 text-sm">
                                            {req.propertyLocation && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {req.propertyLocation}</div>}
                                            {req.propertyType && <div className="flex items-center gap-1.5"><Home className="h-3 w-3" /> {req.propertyType}</div>}
                                        </div>
                                        {req.remarks && <details className="mt-2 text-sm"><summary className="cursor-pointer text-xs font-medium">View Remarks</summary><p className="mt-1 p-2 bg-muted/50 rounded-md whitespace-pre-wrap">{req.remarks}</p></details>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={req.status === 'new' ? 'default' : 'secondary'}>{req.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No Sales Requests Found</AlertTitle>
                        <AlertDescription>
                            No users have submitted a sales request yet.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
