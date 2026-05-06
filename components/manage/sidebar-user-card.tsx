'use client';

import Link from 'next/link';
import { BadgeCheck, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNeupUser, getInitials } from '@/lib/neup-user-context';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Displays the authenticated user's identity at the bottom of the manage
 * sidebar. Reads from the NeupUserContext (populated via whoami).
 */
export function SidebarUserCard() {
  const user = useNeupUser();

  // user === null means either not logged in or still loading.
  // We show a skeleton only briefly — if null after mount it means no session.
  if (!user) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-background/60">
        <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/profile"
      className="flex items-center gap-3 p-3 rounded-lg bg-background/60 hover:bg-background transition-colors group"
    >
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarImage src={user.displayImage || undefined} alt={user.displayName} />
        <AvatarFallback className="text-xs font-semibold">
          {getInitials(user.displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold truncate leading-tight">
            {user.displayName}
          </span>
          {user.verified && (
            <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          )}
        </div>
        <span className="text-xs text-muted-foreground truncate">
          @{user.neupId}
        </span>
      </div>
    </Link>
  );
}
