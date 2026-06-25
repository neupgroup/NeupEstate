'use client';

import { SafeImage } from "@/components/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createAccountAction, setWorkingProfileAction } from "./actions";

export type AgencyManagementAccount = {
  id: string;
  displayName: string;
  displayImage: string | null;
  accountType: string;
  status?: string | null;
  isVerified?: boolean;
  source: "brand" | "linked";
};

function getAccountTypeLabel(accountType: string) {
  const normalized = accountType.trim().toLowerCase();
  if (normalized === "brand" || normalized === "branch") {
    return "Agency Account";
  }

  return "Agency Profile";
}

type BrandAccountCardProps = {
  brandAccount: AgencyManagementAccount;
  existingAccount: {
    id: string;
    displayName: string | null;
    displayImage: string | null;
  } | null;
  isSelected: boolean;
  isDefault: boolean;
  isLast: boolean;
};

export function BrandAccountCard({
  brandAccount,
  existingAccount,
  isSelected,
  isDefault,
  isLast,
}: BrandAccountCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isExisting = !!existingAccount;
  const isRemoteBrandAccount = brandAccount.source === "brand";

  const handleCardClick = async () => {
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
    params.set("selectedAgency", brandAccount.id);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleCreate = async (event?: MouseEvent) => {
    event?.stopPropagation();
    setIsLoading(true);
    setError(null);
    try {
      const result = await createAccountAction({
        id: brandAccount.id,
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
        "flex items-center gap-4 px-4 py-3 bg-background transition-colors hover:bg-muted/40 cursor-pointer",
        isSelected ? "border border-primary/40 bg-muted/60 shadow-sm" : "",
        !isLast ? "border-b border-border" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void handleCardClick();
        }
      }}
    >
      {/* Left: Logo / Avatar */}
      <div className="flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border border-border bg-muted flex items-center justify-center">
        {brandAccount.displayImage ? (
          <SafeImage
            src={brandAccount.displayImage}
            alt={brandAccount.displayName}
            width={48}
            height={48}
            className="object-cover w-full h-full"
            fallbackSrc="https://placehold.co/48x48.png"
          />
        ) : (
          <Building className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* Center: Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm leading-tight truncate">
            {brandAccount.displayName}
          </span>
          {isDefault ? (
            <Badge variant="outline" className="text-xs">
              Default
            </Badge>
          ) : null}
          {brandAccount.source === "linked" && (
            <Badge variant="secondary" className="text-xs">
              Linked
            </Badge>
          )}
          {brandAccount.isVerified && (
            <Badge variant="secondary" className="text-xs">
              Verified
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {getAccountTypeLabel(brandAccount.accountType)}
          {brandAccount.status && (
            <>
              {" · "}
              <span
                className={
                  brandAccount.status === "active"
                    ? "text-green-600"
                    : "text-muted-foreground"
                }
              >
                {brandAccount.status}
              </span>
            </>
          )}
        </p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      {/* Right: Action */}
      <div className="flex-shrink-0">
        {isRemoteBrandAccount && !isExisting ? (
          <Button
            size="sm"
            onClick={(event) => handleCreate(event)}
            type="button"
            disabled={isLoading}
          >
            <Building className="h-3.5 w-3.5 mr-1.5" />
            {isLoading ? "Creating…" : "Create"}
          </Button>
        ) : null}
        {!isRemoteBrandAccount && !isExisting ? (
          <Badge variant="outline" className="text-xs">
            DB link only
          </Badge>
        ) : null}
      </div>
    </div>
  );
}
