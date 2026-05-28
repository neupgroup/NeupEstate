import { getAccounts } from "@/services/account-service";
import { fetchApplicationUsers } from "@/services/neupid/application-users";
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
import { Badge } from "@/components/ui/badge";

export default async function ManageAccountsPage() {
  const [accounts, remoteUsersResult] = await Promise.all([
    getAccounts(),
    fetchApplicationUsers({ offset: 0, limit: 200 }),
  ]);

  const localById = new Map(accounts.map((account) => [account.id, account]));
  const remoteById = new Map(
    (remoteUsersResult.success ? remoteUsersResult.users : []).map((user) => [user.accountId, user]),
  );

  const allIds = Array.from(new Set([...localById.keys(), ...remoteById.keys()]));
  const mergedRows = allIds.map((id) => {
    const local = localById.get(id) ?? null;
    const remote = remoteById.get(id) ?? null;

    let status: "synced" | "local_only" | "remote_only" = "synced";
    if (local && !remote) status = "local_only";
    if (!local && remote) status = "remote_only";

    return { id, local, remote, status };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold leading-none tracking-tight">User Accounts</h2>
          <p className="text-sm text-muted-foreground">
            {accounts.length} local accounts, {" "}
            {remoteUsersResult.success ? remoteUsersResult.total : 0} remote application users.
          </p>
        </div>
      </div>
      {!remoteUsersResult.success && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Remote User Sync Unavailable</AlertTitle>
          <AlertDescription>
            Could not load application users from Neup Account ({remoteUsersResult.status}): {remoteUsersResult.error}
          </AlertDescription>
        </Alert>
      )}
      <div>
        {mergedRows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account ID</TableHead>
                <TableHead>Sync Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Accessed</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mergedRows.map(({ id, local, remote, status }) => (
                <TableRow key={id}>
                  <TableCell className="font-mono text-xs">
                    {local ? (
                      <ClientLink href={`/manage/accounts/${id}`} className="hover:underline">
                        {id}
                      </ClientLink>
                    ) : (
                      id
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        status === "synced"
                          ? "default"
                          : status === "local_only"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {status === "synced"
                        ? "Synced"
                        : status === "local_only"
                          ? "Local only"
                          : "Remote only"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {local && remote
                      ? "Local + Remote"
                      : local
                        ? "Local"
                        : "Remote"}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">
                      {local?.account_type ?? remote?.accountType ?? "unknown"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {local?.accessed_on ? (
                      <RelativeTime timestamp={local.accessed_on} />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {local?.created_on ? (
                      <RelativeTime timestamp={local.created_on} />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
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
