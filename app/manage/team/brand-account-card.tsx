'use client';

import { SafeImage } from "@/components/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createAccountAction, setWorkingProfileAction } from "./account-actions";

export type AgencyManagementAccount = {
  id: string;
  neupId?: string | null;
  displayName: string;
  displayImage: string | null;
  accountType: string;
  isVerified?: boolean;
  source: "brand" | "linked";
};

function getAccountTypeLabel(accountType: string) {
  const normalized = accountType.trim().toLowerCase();
  if (normalized === "brand" || normalized === "branch") {
    return "Agency Account";
  }
  if (normalized === "individual") {
    return "Personal Account";
  }
  if (normalized === "dependent") {
    return "Personal Profile";
  }
  if (normalized === "guest") {
    return "Guest Profile";
  }

  return "Account Profile";
}

function supportsRemoteConnection(accountType: string) {
  const normalized = accountType.trim().toLowerCase();
  return normalized === "brand" || normalized === "branch";
}

type BrandAccountCardProps = {
  brandAccount: AgencyManagementAccount;
  existingAccount: {
    id: string;
    displayName: string | null;
    displayImage: string | null;
    connectionId?: string | null;
  } | null;
  isSelected: boolean;
  isDefault: boolean;
  isLast: boolean;
  allowSelection?: boolean;
};

export function BrandAccountCard({
  brandAccount,
  existingAccount,
  isSelected,
  isDefault,
  isLast,
  allowSelection = true,
}: BrandAccountCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isExisting = !!existingAccount;
  const hasConnection = Boolean(existingAccount?.connectionId?.trim());
  const isRemoteBrandAccount = brandAccount.source === "brand";
  const canCreateRemoteConnection =
    isRemoteBrandAccount &&
    supportsRemoteConnection(brandAccount.accountType) &&
    !hasConnection;

  const handleCardClick = async () => {
    if (!allowSelection) {
      return;
    }

    if (isSelected && isExisting) {
      setIsLoading(true);
      setError(null);
      try {
        const result = await setWorkingProfileAction(brandAccount.id);
        if (result.success) {
          router.refresh();
        } else {
          setError(result.error || "Failed to set working profile");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("workingProfile", brandAccount.id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleCreate = async (event?: MouseEvent) => {
    event?.stopPropagation();
    setIsLoading(true);
    setError(null);
    try {
      const result = await createAccountAction({
        id: brandAccount.id,
        neupId: brandAccount.neupId,
        accountType: brandAccount.accountType,
        displayName: brandAccount.displayName,
        displayImage: brandAccount.displayImage,
      });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed to create account");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={[
        "flex items-center gap-4 px-4 py-3 bg-background transition-colors",
        allowSelection ? "cursor-pointer hover:bg-muted/40" : "",
        isSelected ? "border border-primary/40 bg-muted/60 shadow-sm" : "",
        !isLast ? "border-b border-border" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={allowSelection ? handleCardClick : undefined}
      role={allowSelection ? "button" : undefined}
      tabIndex={allowSelection ? 0 : undefined}
      onKeyDown={(event) => {
        if (!allowSelection) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void handleCardClick();
        }
      }}
    >
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
        {brandAccount.displayImage ? (
          <SafeImage
            src={brandAccount.displayImage}
            alt={brandAccount.displayName}
            width={48}
            height={48}
            className="h-full w-full object-cover"
            fallbackSrc="https://placehold.co/48x48.png"
          />
        ) : (
          <Building className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium leading-tight">
            {brandAccount.displayName}
          </span>
          {isDefault ? (
            <Badge variant="outline" className="text-xs">
              Default
            </Badge>
          ) : null}
          {brandAccount.source === "linked" ? (
            <Badge variant="secondary" className="text-xs">
              Linked
            </Badge>
          ) : null}
          {brandAccount.isVerified ? (
            <Badge variant="secondary" className="text-xs">
              Verified
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {getAccountTypeLabel(brandAccount.accountType)}
        </p>
        {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
      </div>

      <div className="flex-shrink-0">
        {canCreateRemoteConnection ? (
          <Button
            size="sm"
            onClick={(event) => handleCreate(event)}
            type="button"
            disabled={isLoading}
          >
            <Building className="mr-1.5 h-3.5 w-3.5" />
            {isLoading ? "Creating…" : "Create"}
          </Button>
        ) : null}
        {!canCreateRemoteConnection && !isExisting ? (
          <Badge variant="outline" className="text-xs">
            Profile only
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
