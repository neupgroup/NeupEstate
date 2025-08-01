
import { getAgents } from "@/services/agent-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, AlertCircle, UserCheck, UserX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ClientLink } from "@/components/client-link";

function getInitials(name: string) {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export default async function ManageAgentsPage() {
  const agents = await getAgents();

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">Agent Management</h2>
            <p className="text-sm text-muted-foreground">
                {agents.length} agents found.
            </p>
        </div>
        <ClientLink href="/manage/agents/create" className={buttonVariants()}>
            <UserPlus className="mr-2 h-4 w-4"/>
            Create Agent
        </ClientLink>
      </div>
      <div>
        {agents.length > 0 ? (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {agents.map((agent) => (
                <TableRow key={agent.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={agent.photoUrl} alt={agent.name} />
                                <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                            </Avatar>
                            <ClientLink href={`/manage/agents/${agent.id}/edit`} className="hover:underline">
                                {agent.name}
                            </ClientLink>
                        </div>
                    </TableCell>
                    <TableCell>
                        {agent.location}
                    </TableCell>
                    <TableCell>
                        <div className="flex flex-col gap-1">
                           {agent.contact.email && <span className="text-sm">{agent.contact.email}</span>}
                           {agent.contact.phone && <span className="text-sm text-muted-foreground">{agent.contact.phone}</span>}
                        </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant={agent.registered ? 'default' : 'secondary'}>
                            {agent.registered ? <UserCheck className="mr-2 h-3 w-3" /> : <UserX className="mr-2 h-3 w-3" />}
                            {agent.registered ? "Registered" : "Manual"}
                        </Badge>
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        ) : (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Agents Found</AlertTitle>
                <AlertDescription>
                   No agents were found in the database. You can add one by clicking the button above.
                </AlertDescription>
            </Alert>
        )}
      </div>
    </div>
  );
}
