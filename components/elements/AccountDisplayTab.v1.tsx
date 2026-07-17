"use client";

/*
::neup.documentation::account-display-tab-v1
::title Account Display Tab V1

::public

Renders the signed-in account display tab used by the primary header.

::public end

::private

The component accepts already-loaded account data and does not fetch authentication state.

::private end

::end
*/

import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { getAccountDisplayName, getAccountHandle, type AccountDisplayUser } from "@/services/account/me";
import { ProfileV1 } from "@/components/elements/Profile.v1";
import { cn } from "@/core/utils";

export function AccountDisplayTabV1({
  user,
  mobile = false,
  onClick,
}: {
  user: AccountDisplayUser;
  mobile?: boolean;
  onClick?: () => void;
}) {
  const displayName = getAccountDisplayName(user.displayName);
  const handleText = getAccountHandle(user.neupId);

  if (mobile) {
    return (
      <Link
        href="/profile"
        onClick={onClick}
        className="mx-3 mt-3 flex shrink-0 items-center gap-3 rounded-lg bg-secondary p-2.5"
      >
        <ProfileV1 displayName={displayName} imageSrc={user.displayImage} />
        <div className="min-w-0 flex flex-col">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-semibold">{displayName}</span>
            {user.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />}
          </div>
          <span className="text-xs text-muted-foreground">{handleText}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/profile"
      onClick={onClick}
      className={cn("flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-secondary/60")}
    >
      <div className="mr-1 flex min-w-0 flex-col items-end">
        <span className="truncate text-sm font-semibold">{displayName}</span>
        <span className="text-xs text-muted-foreground">{handleText}</span>
      </div>
      <ProfileV1 displayName={displayName} imageSrc={user.displayImage} />
    </Link>
  );
}
