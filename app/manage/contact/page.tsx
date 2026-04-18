
import { getContactSubmissions } from '@/services/contact-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, User, Mail, Phone, ChevronDown } from 'lucide-react';
import { RelativeTime } from '@/components/manage/relative-time';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default async function ContactSubmissionsPage() {
    const submissions = await getContactSubmissions();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">
                    Contact Submissions
                </h2>
                <p className="text-sm text-muted-foreground">
                    {submissions.length} {submissions.length === 1 ? 'message' : 'messages'} received. Newest first.
                </p>
            </div>
            <div>
                {submissions.length > 0 ? (
                    <div className="border rounded-lg">
                        <Accordion type="single" collapsible className="w-full">
                            {submissions.map((sub) => (
                                <AccordionItem value={sub.id} key={sub.id} className="px-4">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex-1 text-left">
                                            <div className="flex items-center gap-4">
                                                <Badge variant={sub.status === 'new' ? 'default' : 'secondary'}>{sub.status}</Badge>
                                                <span className="font-semibold">{sub.subject}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                From: {sub.name} - <RelativeTime timestamp={sub.createdAt} />
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4 p-4 border-t">
                                            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                                                <div className="flex items-center gap-2"><User className="h-4 w-4" />{sub.name}</div>
                                                <div className="flex items-center gap-2"><Mail className="h-4 w-4" />{sub.email}</div>
                                                {sub.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" />{sub.phone}</div>}
                                            </div>
                                            <p className="whitespace-pre-wrap p-4 bg-muted/50 rounded-md">{sub.body}</p>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                ) : (
                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>No Submissions Yet</AlertTitle>
                        <AlertDescription>
                            Your contact form has not received any submissions.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
}
