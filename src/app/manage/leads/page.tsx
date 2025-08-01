
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Flame } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClientLink } from "@/components/client-link";
import { getConversations } from "@/services/conversation-service";
import { RelativeTime } from "@/components/manage/relative-time";

export default async function ManageLeadsPage() {
  const conversations = await getConversations();

  // Filter for conversations that have a lead score and sort them
  const leads = conversations
    .filter(c => c.leadScore !== undefined)
    .sort((a, b) => (b.leadScore ?? 0) - (a.leadScore ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">Client Leads</h2>
            <p className="text-sm text-muted-foreground">
                Showing {leads.length} conversations, ranked by AI lead score.
            </p>
        </div>
      </div>
      <div>
        {leads.length > 0 ? (
            <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="w-[80px]">Score</TableHead>
                    <TableHead>Last Interaction</TableHead>
                    <TableHead className="w-[150px] text-right">Interaction On</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {leads.map((lead) => {
                  const linkHref = `/manage/leads/${lead.id}`;
                  
                  return (
                    <TableRow key={lead.id}>
                        <TableCell>
                            <ClientLink href={linkHref} className="hover:underline">
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={lead.customerAvatarUrl} alt={lead.customerName} data-ai-hint="person portrait" />
                                        <AvatarFallback>{lead.customerName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium">
                                        {lead.customerName}
                                    </span>
                                </div>
                            </ClientLink>
                        </TableCell>
                        <TableCell>
                            <span className="font-semibold">{lead.leadScore}/10</span>
                        </TableCell>
                        <TableCell>
                            <p className="text-sm text-muted-foreground font-normal truncate max-w-md">
                                {lead.lastMessageSender === 'agent' && 'You: '}
                                {lead.lastMessageSnippet}
                            </p>
                        </TableCell>
                         <TableCell className="text-right text-xs text-muted-foreground">
                            <RelativeTime timestamp={lead.lastMessageAt} />
                        </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
            </Table>
        ) : (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Leads Found</AlertTitle>
                <AlertDescription>
                   No conversations have been scored by the AI yet. New incoming messages will be automatically analyzed and ranked here.
                </AlertDescription>
            </Alert>
        )}
      </div>
    </div>
  );
}
