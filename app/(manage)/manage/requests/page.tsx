
import { getPropertyRequests } from '@/services/property-request-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, User, MapPin, Home, DollarSign, BedDouble, Bath } from 'lucide-react';
import { RelativeTime } from '@/components/manage/relative-time';
import { Badge } from '@/components/ui/badge';

export default async function PropertyRequestsPage() {
    const requests = await getPropertyRequests();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">
                    Property Requests
                </h2>
                <p className="text-sm text-muted-foreground">
                    {requests.length} {requests.length === 1 ? 'request' : 'requests'} received. Newest first.
                </p>
            </div>
            <div>
                {requests.length > 0 ? (
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Requirements</TableHead>
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
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                            {req.location && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Location: {req.location}</div>}
                                            {req.propertyType && <div className="flex items-center gap-1.5"><Home className="h-3 w-3" /> Type: {req.propertyType}</div>}
                                            {req.budget && <div className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Budget: ${req.budget.toLocaleString()}</div>}
                                            {req.bedrooms && <div className="flex items-center gap-1.5"><BedDouble className="h-3 w-3" /> Bedrooms: {req.bedrooms}+</div>}
                                            {req.bathrooms && <div className="flex items-center gap-1.5"><Bath className="h-3 w-3" /> Bathrooms: {req.bathrooms}+</div>}
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
                        <AlertTitle>No Property Requests Found</AlertTitle>
                        <AlertDescription>
                            No users have submitted a property request yet.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
