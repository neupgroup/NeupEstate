/*
::neup.documentation::account-display
::title Account Display

::public

Provides display helpers for account names, handles, and initials.

::public end

::private

These helpers are presentation-safe formatters. They do not read cookies, verify sessions, or fetch account data.

::private end

::end
*/

export type AccountDisplayUser = {
  accountId?: string | null;
  displayName?: string | null;
  displayImage?: string | null;
  accountType?: string | null;
  neupId?: string | null;
  verified?: boolean | null;
  workingProfile?: string | null;
  workingProfileDisplayName?: string | null;
};

export function getAccountDisplayName(displayName?: string | null): string {
  const normalizedName = displayName?.trim();
  return normalizedName || "Guest";
}

export function getAccountHandle(neupId?: string | null): string {
  const normalizedHandle = neupId?.trim();
  return normalizedHandle ? `@${normalizedHandle.replace(/^@+/, "")}` : "@guest";
}

export function getInitials(name?: string | null): string {
  const initials = name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "U";
}
