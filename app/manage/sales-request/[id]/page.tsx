import { Clock, Home, Mail, MapPin, MessageSquare, Phone, User, ContactRound, Building2 } from 'lucide-react';
import { notFound } from 'next/navigation';
import { prisma } from '@neup/core/database/prisma';
import { canShowManagePanelLink } from '@/services/permissions';
import { Link } from '@neup/components/ui/link';
import { Badge } from '@neup/components/ui/badge';
import { RelativeTime } from '@/components/manage/relative-time';

export default async function SalesRequestPage({ params }: { params: Promise<{ id: string }> }) {
    if (!await canShowManagePanelLink()) notFound();
    const { id } = await params;
    const request = await prisma.salesRequest.findUnique({ where: { id } });
    if (!request) notFound();

    return (
        <div className="space-y-6">
            <Link href="/manage/sales-requests" type="plain" className="pl-0 text-muted-foreground hover:bg-transparent hover:text-foreground hover:underline">&lt; Go back</Link>
            <section className="space-y-8">
                <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 p-5 sm:p-7">
                    <div aria-hidden="true" className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
                    <div className="relative flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground shadow-sm">
                            {request.name.trim().charAt(0).toUpperCase() || <User aria-hidden="true" className="h-6 w-6" />}
                        </div>
                        <div className="min-w-0 space-y-2">
                            <h1 className="break-words text-2xl font-semibold tracking-tight">{request.name}</h1>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <Clock aria-hidden="true" className="h-4 w-4 shrink-0" />
                                <span>Submitted <RelativeTime timestamp={request.createdAt.toISOString()} /></span>
                                <Badge variant={request.status === 'new' ? 'default' : 'secondary'}>{request.status}</Badge>
                            </div>
                        </div>
                    </div>
                </header>
                <section aria-labelledby="contact-info" className="space-y-4">
                    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3">
                        <span className="row-span-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400"><ContactRound aria-hidden="true" className="h-5 w-5" /></span>
                        <h2 id="contact-info" className="text-lg font-semibold leading-6">Contact info</h2>
                        <p className="col-start-2 mt-1 text-sm leading-5 text-muted-foreground">Reach out to the person who submitted this request.</p>
                    </div>
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-5 border-l-2 border-primary/15 pl-4 text-sm sm:grid-cols-2 sm:pl-5">
                        <div className="min-w-0"><dt className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Phone aria-hidden="true" className="h-4 w-4 shrink-0" />Phone</dt><dd>{request.phone ? <a href={`tel:${request.phone}`} className="break-words underline">{request.phone}</a> : 'Not provided'}</dd></div>
                        <div className="min-w-0"><dt className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Mail aria-hidden="true" className="h-4 w-4 shrink-0" />Email</dt><dd><a href={`mailto:${request.email}`} className="break-all underline">{request.email}</a></dd></div>
                    </dl>
                </section>
                <section aria-labelledby="property-info" className="space-y-4">
                    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3">
                        <span className="row-span-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Building2 aria-hidden="true" className="h-5 w-5" /></span>
                        <h2 id="property-info" className="text-lg font-semibold leading-6">Property info</h2>
                        <p className="col-start-2 mt-1 text-sm leading-5 text-muted-foreground">Details about the property they are looking to sell.</p>
                    </div>
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-5 border-l-2 border-primary/15 pl-4 text-sm sm:grid-cols-2 sm:pl-5">
                        <div className="min-w-0"><dt className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><MapPin aria-hidden="true" className="h-4 w-4 shrink-0" />Property location</dt><dd className="break-words font-medium">{request.propertyLocation || 'Not provided'}</dd></div>
                        <div className="min-w-0"><dt className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Home aria-hidden="true" className="h-4 w-4 shrink-0" />Property type</dt><dd>{request.propertyType || 'Not provided'}</dd></div>
                        <div className="min-w-0 sm:col-span-2"><dt className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><MessageSquare aria-hidden="true" className="h-4 w-4 shrink-0" />Remarks</dt><dd className="whitespace-pre-wrap break-words rounded-xl bg-muted/40 p-4 leading-relaxed">{request.remarks || 'No remarks'}</dd></div>
                    </dl>
                </section>
            </section>
        </div>
    );
}
