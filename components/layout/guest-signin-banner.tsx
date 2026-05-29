"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type GuestSigninBannerProps = {
  variant: "hero" | "inline";
};

const ACCOUNT_BASE_URL = "https://neupgroup.com/account";

function buildLoginHref(currentUrl: string | null) {
  if (!currentUrl) {
    return ACCOUNT_BASE_URL;
  }

  return `${ACCOUNT_BASE_URL}?authenticatesTo=${encodeURIComponent(currentUrl)}`;
}

export function GuestSigninBanner({ variant }: GuestSigninBannerProps) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const isHero = variant === "hero";
  const loginHref = buildLoginHref(currentUrl);

  return (
    <section
      className={cn(
        isHero
          ? "container mx-auto px-4 sm:px-6 lg:px-8 py-6"
          : "border-b border-amber-200/70 bg-amber-50/80"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-background px-4 py-4 shadow-sm",
          !isHero && "container mx-auto rounded-none border-0 bg-transparent px-0 py-4 shadow-none"
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              Sign in for personalized recommendations and support.
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Get tailored listings, smarter suggestions, and faster help across the site.
            </p>
          </div>
        </div>

        <Link
          href={loginHref}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
        >
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}