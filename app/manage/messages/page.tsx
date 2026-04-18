
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, MessageSquarePlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClientLink } from "@/components/client-link";
import { getConversations } from "@/services/conversation-service";
import { RelativeTime } from "@/components/manage/relative-time";
import { buttonVariants } from "@/components/ui/button";


export default async function ManageMessagesPage() {
  const conversations = await getConversations();

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">Messages</h2>
            <p className="text-sm text-muted-foreground">
                You have {conversations.filter(m => !m.isRead).length} unread messages.
            </p>
        </div>
        <div className="flex items-center gap-2">
            <ClientLink href="/manage/messages/create" className={buttonVariants({ variant: 'outline' })}>
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                New Conversation
            </ClientLink>
        </div>
      </div>
      <div>
        {conversations.length > 0 ? (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[200px]">Customer</TableHead>
                <TableHead>Subject / Last Message</TableHead>
                <TableHead className="w-[150px] text-right">Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {conversations.map((convo) => (
                <TableRow key={convo.id} className={!convo.isRead ? "bg-muted/50 font-bold" : ""}>
                    <TableCell>
                         <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={convo.customerAvatarUrl} alt={convo.customerName} data-ai-hint="person portrait" />
                                <AvatarFallback>{convo.customerName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className={!convo.isRead ? "text-foreground" : "text-muted-foreground"}>
                                {convo.customerName}
                            </span>
                        </div>
                    </TableCell>
                    <TableCell>
                        <ClientLink href={`/manage/messages/${convo.id}`} className="hover:underline">
                            <p className={!convo.isRead ? "text-foreground" : "text-muted-foreground"}>{convo.subject}</p>
                        </ClientLink>
                        <p className="text-xs text-muted-foreground font-normal truncate max-w-md">
                            {convo.lastMessageSender === 'agent' && 'You: '}
                            {convo.lastMessageSnippet}
                        </p>
                    </TableCell>
                    <TableCell className={`text-right text-xs ${!convo.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                        <RelativeTime timestamp={convo.lastMessageAt} />
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        ) : (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Messages Found</AlertTitle>
                <AlertDescription>
                   Your inbox is empty. You can start a new conversation by clicking the button above.
                </AlertDescription>
            </Alert>
        )}
      </div>
    </div>
  );
}
