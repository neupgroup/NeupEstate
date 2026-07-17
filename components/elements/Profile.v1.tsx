"use client";

import { User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/components/account-display";

export function ProfileV1({
  displayName,
  imageSrc,
}: {
  displayName?: string | null;
  imageSrc?: string | null;
}) {
  return (
    <Avatar className="h-8 w-8">
      {imageSrc ? (
        <>
          <AvatarImage src={imageSrc} alt={displayName || "Profile"} />
          <AvatarFallback className="text-xs font-semibold">
            {getInitials(displayName || '')}
          </AvatarFallback>
        </>
      ) : (
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      )}
    </Avatar>
  );
}
