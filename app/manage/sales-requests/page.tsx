
import { getSalesRequests } from '@/services/inquiry/sales-requests';
import { Alert, AlertDescription, AlertTitle } from '@neup/components/ui/alert';
import { AlertCircle, ChevronRight, Clock, UserRound, Inbox } from 'lucide-react';
import { Link } from '@neup/components/ui/link';
import { RelativeTime } from '@/components/manage/relative-time';

export default async function SalesRequestsPage() {
    const requests = await getSalesRequests();

    return (
        <div className="space-y-6">
            <header>
                <div className="flex flex-col items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                        <Inbox aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight">Sales requests</h1>
                            <span className="text-sm text-muted-foreground">{requests.length}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">Requests from people looking to sell their property.</p>
                    </div>
                </div>
            </header>
            <div>
                {requests.length > 0 ? (
                    <div className="space-y-3">
                        {requests.map((request) => (
                            <Link
                                key={request.id}
                                href={`/manage/sales-request/${request.id}`}
                                className="group flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-card-foreground transition-all hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-4 sm:px-5"
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">
                                    {request.name.trim().charAt(0).toUpperCase() || <UserRound aria-hidden="true" className="h-4 w-4" />}
                                </span>
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <h2 className="min-w-0 break-words text-sm font-semibold">{request.name}</h2>
                                        <time dateTime={request.createdAt} title={new Date(request.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu', dateStyle: 'medium', timeStyle: 'short' }) + ' (Nepal time)'} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock aria-hidden="true" className="h-3 w-3" />
                                            <RelativeTime timestamp={request.createdAt} />
                                        </time>
                                    </div>
                                    <p className="truncate text-sm text-muted-foreground">{request.remarks || 'No remarks'}</p>
                                </div>
                                <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No sales requests yet</AlertTitle>
                        <AlertDescription>
                            New seller inquiries will appear here when someone submits a request.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
