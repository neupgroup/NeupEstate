type AccountPermission = string;
type AccountRole = string | null;

// Returns the current account's permissions.
export async function getAccountsPermission(): Promise<AccountPermission[]> {
  return [];
}

// Returns the current account's role.
export async function getAccountRole(): Promise<AccountRole> {
  return null;
}

// Checks whether a specific account can perform a given action.
export async function canAccountDoThis(
  accountId: string,
  action: string
): Promise<boolean> {
  if (!accountId?.trim() || !action?.trim()) {
    return false;
  }

  const permissions = await getAccountsPermission();
  return permissions.includes(action);
}
