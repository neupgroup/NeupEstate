'use client';

import { SafeImage } from "@/components/safe-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, CheckCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { createAccountAction, syncAccountAction } from "./actions";
import { useRouter } from "next/navigation";
import type { BrandAccount } from "@/services/neupid/get-brand-accounts";

type BrandAccountCardProps = {
  brandAccount: BrandAccount;
  existingAccount: {
    id: string;
    displayName: string | null;
    displayImage: string | null;
  } | null;
  isLast: boolean;
};

export function BrandAccountCard({
  brandAccount,
  existingAccount,
  isLast,
}: BrandAccountCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isExisting = !!existingAccount;
  const needsSync =
    isExisting &&
    (existingAccount.displayName !== brandAccount.displayName ||
      existingAccount.displayImage !== brandAccount.displayImage);

  const handleCreate = async () => {
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

  const handleSync = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await syncAccountAction({
        id: brandAccount.id,
        displayName: brandAccount.displayName,
        displayImage: brandAccount.displayImage,
      });
      if (result.success) {
        router.refresh();
      } else {
        setError(result.error || "Failed to sync account");
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
        "flex items-center gap-4 px-4 py-3 bg-background transition-colors hover:bg-muted/40",
        !isLast ? "border-b border-border" : "",
      ]
        .filter(Boolean)
        .join(" ")}
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
          {isExisting && (
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-300 text-xs"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Synced
            </Badge>
          )}
          {brandAccount.isVerified && (
            <Badge variant="secondary" className="text-xs">
              Verified
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {brandAccount.accountType}
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
        {isExisting ? (
          <Button
            size="sm"
            variant={needsSync ? "default" : "outline"}
            onClick={handleSync}
            disabled={isLoading || !needsSync}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
            />
            {needsSync ? "Sync" : "Up to date"}
          </Button>
        ) : (
          <Button size="sm" onClick={handleCreate} disabled={isLoading}>
            <Building className="h-3.5 w-3.5 mr-1.5" />
            {isLoading ? "Creating…" : "Create"}
          </Button>
        )}
      </div>
    </div>
  );
}
