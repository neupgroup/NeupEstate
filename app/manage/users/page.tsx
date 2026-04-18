
import { getAccounts } from "@/services/account-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ClientLink } from "@/components/client-link";
import { RelativeTime } from "@/components/manage/relative-time";

export default async function ManageUsersPage() {
  const accounts = await getAccounts();

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
            <h2 className="text-2xl font-semibold leading-none tracking-tight">User Accounts</h2>
            <p className="text-sm text-muted-foreground">
                {accounts.length} accounts found in the system.
            </p>
        </div>
      </div>
      <div>
        {accounts.length > 0 ? (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Account ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Accessed</TableHead>
                <TableHead>Created</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {accounts.map((account) => (
                <TableRow key={account.id}>
                    <TableCell className="font-mono text-xs">
                        <ClientLink href={`/manage/users/${account.id}`} className="hover:underline">
                            {account.id}
                        </ClientLink>
                    </TableCell>
                    <TableCell>
                        <span className="capitalize">{account.account_type}</span>
                    </TableCell>
                    <TableCell>
                        <RelativeTime timestamp={account.accessed_on} />
                    </TableCell>
                    <TableCell>
                        <RelativeTime timestamp={account.created_on} />
                    </TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        ) : (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Accounts Found</AlertTitle>
                <AlertDescription>
                   There are no user accounts in the system yet. New accounts are created automatically when users visit the site.
                </AlertDescription>
            </Alert>
        )}
      </div>
    </div>
  );
}
