
import { getVisitRequests } from '@/services/visit-request-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CalendarClock, User, Mail, Phone, Home, Clock } from 'lucide-react';
import { RelativeTime } from '@/components/manage/relative-time';
import { Badge } from '@/components/ui/badge';
import { ClientLink } from '@/components/client-link';

export default async function VisitRequestsPage() {
    const requests = await getVisitRequests();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">
                    Visit Requests
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
                                <TableHead>Request Details</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Property</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell>
                                        <div className="font-medium flex items-center gap-2"><CalendarClock className="h-4 w-4" /> {new Date(req.preferred_date).toLocaleDateString()}</div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> {req.preferred_time || 'Any'}</div>
                                        <div className="text-xs text-muted-foreground pt-1">
                                            Submitted <RelativeTime timestamp={req.createdAt} />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium flex items-center gap-2"><User className="h-4 w-4" />{req.name}</div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4" />{req.email}</div>
                                        {req.phone && <div className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" />{req.phone}</div>}
                                    </TableCell>
                                    <TableCell>
                                        <a href={`/properties/${req.propertyId}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline flex items-center gap-2">
                                            <Home className="h-4 w-4" /> {req.propertyTitle}
                                        </a>
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
                        <AlertTitle>No Visit Requests Found</AlertTitle>
                        <AlertDescription>
                            No users have submitted a visit request yet.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
