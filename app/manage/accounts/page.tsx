import { getAccounts } from "@/services/account-service";
import { fetchApplicationUsers } from "@/services/neupid/application-users";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, User } from "lucide-react";
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
          <div className="divide-y divide-border border rounded-lg">
            {mergedRows.map(({ id, local, remote, status }) => {
              const name = local?.display_name ?? remote?.displayName ?? 'Unnamed Account';
              const acctType = local?.account_type ?? remote?.accountType ?? 'unknown';
              const isSynced = status === 'synced';
              return (
                <ClientLink
                  key={id}
                  href={`/manage/accounts/${id}`}
                  className="block p-4 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border bg-muted flex items-center justify-center">
                      {local?.display_image ?? remote?.displayImage ? (
                        <img
                          src={local?.display_image ?? remote?.displayImage}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <p className="font-medium truncate min-w-0">{name}</p>
                    {!isSynced && (
                      <span className="flex-shrink-0 w-3 h-3 rounded-full bg-red-500" />
                    )}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    <span className="capitalize">{acctType}</span>
                    <span className="mx-2">•</span>
                    {local?.accessed_on ? (
                      <RelativeTime timestamp={local.accessed_on} />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </ClientLink>
              );
            })}
          </div>
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
