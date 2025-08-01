
import { getMortgageRequests } from '@/services/mortgage-request-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, User, MapPin, BadgePercent, Phone, Mail, Contact } from 'lucide-react';
import { RelativeTime } from '@/components/manage/relative-time';
import { Badge } from '@/components/ui/badge';
import { WhatsAppIcon } from '@/components/icons';

export default async function MortgageRequestsPage() {
    const requests = await getMortgageRequests();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">
                    Mortgage Requests
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
                                <TableHead>Details</TableHead>
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
                                        <div className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-3 w-3" />{req.email}</div>
                                        {req.phone && <div className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-3 w-3" />{req.phone}</div>}
                                    </TableCell>
                                    <TableCell className="max-w-md">
                                        <div className="flex flex-col gap-1 text-sm">
                                            {req.address && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {req.address}</div>}
                                            {req.income && <div className="flex items-center gap-1.5"><BadgePercent className="h-3 w-3" /> Approx. Income: ${req.income.toLocaleString()}</div>}
                                        </div>
                                        {req.moreDetails && <details className="mt-2 text-sm"><summary className="cursor-pointer text-xs font-medium">View Details</summary><p className="mt-1 p-2 bg-muted/50 rounded-md whitespace-pre-wrap">{req.moreDetails}</p></details>}
                                        <div className="flex items-center gap-2 mt-2">
                                            {req.contactMethods.map(method => (
                                                <Badge key={method} variant="outline" className="flex items-center gap-1">
                                                    {method === 'whatsapp' ? <WhatsAppIcon className="h-3 w-3" /> : <Contact className="h-3 w-3" />}
                                                    {method}
                                                </Badge>
                                            ))}
                                        </div>
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
                        <AlertTitle>No Mortgage Requests Found</AlertTitle>
                        <AlertDescription>
                            No users have submitted a mortgage request yet.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
