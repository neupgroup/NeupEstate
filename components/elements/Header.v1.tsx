"use client";

import Link from "next/link";
import { ExternalLink, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/core/utils";
import { isActivePublicHrefV1 } from "@/components/logic/PublicNavSelection.v1";
import { appendManageProfileParamV1, getLongestMatchingManageNavHrefV1 } from "@/components/logic/ManageNavSelection.v1";
import { manageNav } from "@/components/manage-nav";
import { ProfileV1 } from "@/components/elements/Profile.v1";
import { AccountDisplayTabV1 } from "@/components/elements/AccountDisplayTab.v1";
import type { SessionUser } from "@/core/providers/session";

const publicNavLinks = [
  { href: "/sell", label: "Sell" },
  { href: "/agencies", label: "Agencies" },
  { href: "/agents", label: "Agents" },
  { href: "/mortgage/request", label: "Mortgage" },
];

export function HeaderV1({
  pathname,
  isManage,
  selectedProfile,
  workingProfile,
  menuOpen,
  setMenuOpen,
  user,
}: {
  pathname: string;
  isManage: boolean;
  selectedProfile: string | null;
  workingProfile: string | null;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  user: SessionUser | null;
}) {
  const effectiveUser = user;
  const activeProfileName = user?.workingProfileDisplayName?.trim() || null;
  const [selectedProfileName, setSelectedProfileName] = useState<string | null>(activeProfileName);
  const logoProfileName = selectedProfileName?.trim() || null;

  useEffect(() => {
    const normalizedSelectedProfile = selectedProfile?.trim() || null;
    const normalizedWorkingProfile = workingProfile?.trim() || null;
    const normalizedDefaultProfile = user?.workingProfile?.trim() || null;
    const profileIdToShow = normalizedSelectedProfile ?? normalizedWorkingProfile ?? normalizedDefaultProfile;

    if (!profileIdToShow || profileIdToShow === user?.accountId) {
      setSelectedProfileName(null);
      return;
    }

    if (profileIdToShow === normalizedDefaultProfile && activeProfileName) {
      setSelectedProfileName(activeProfileName);
      return;
    }

    const controller = new AbortController();

    const resolveSelectedProfile = async () => {
      try {
        const response = await fetch(
          `/bridge/api.v1/accounts/lookup?accountId=${encodeURIComponent(profileIdToShow)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          setSelectedProfileName(profileIdToShow);
          return;
        }

        const data = await response.json();
        const nextName =
          typeof data?.account?.displayName === "string" && data.account.displayName.trim()
            ? data.account.displayName.trim()
            : profileIdToShow;

        setSelectedProfileName(nextName);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSelectedProfileName(profileIdToShow);
      }
    };

    void resolveSelectedProfile();

    return () => controller.abort();
  }, [activeProfileName, selectedProfile, user?.accountId, user?.workingProfile, workingProfile]);

  const renderPublicNav = () =>
    publicNavLinks.map((link) => {
      const isActive = isActivePublicHrefV1(pathname, link.href);
      return (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => setMenuOpen(false)}
          className={cn(
            buttonVariants({ variant: "plain", size: "sm" }),
            "w-full justify-start text-sm",
            isActive && "bg-primary/15 text-primary hover:bg-primary/20 active:bg-primary/25 font-semibold"
          )}
        >
          {link.label}
        </Link>
      );
    });

  const renderManageNav = () =>
    manageNav.map((item, i) => {
      if (item.type === "heading") {
        return (
          <p key={`h-${i}`} className="px-2 pt-3 pb-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {item.label}
          </p>
        );
      }
      const Icon = item.icon;
      const isActive = getLongestMatchingManageNavHrefV1(pathname, manageNav) === item.href;
      return (
        <Link
          key={item.href}
          href={item.external ? item.href : appendManageProfileParamV1(item.href, { selectedProfile, workingProfile })}
          onClick={() => setMenuOpen(false)}
          className={cn(
            buttonVariants({ variant: "plain", size: "sm" }),
            "w-full justify-start text-sm",
            isActive
              ? "bg-primary/15 text-primary hover:bg-primary/20 active:bg-primary/25 font-semibold"
              : "text-foreground/80"
          )}
        >
          <Icon className="mr-2 h-4 w-4 shrink-0" />
          <span className="min-w-0 truncate">{item.label}</span>
          {item.external && <ExternalLink className="ml-1 h-3.5 w-3.5 shrink-0" />}
        </Link>
      );
    });

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-card shadow-md">
        <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
          <div className="flex-1 justify-start flex">
            <Link href="/" className="flex items-center gap-2">
              <img src="https://cdn.neupgroup.com/neupestate/logo.png" alt="Neup.Estate Logo" className="h-9 w-9 object-contain" />
              <div className="flex min-w-0 flex-col">
                <span className="font-headline text-lg font-bold leading-tight">Neup.Estate</span>
                {logoProfileName ? (
                  <span className="max-w-[180px] truncate text-[11px] leading-tight text-muted-foreground sm:max-w-[220px]">
                    {logoProfileName}
                  </span>
                ) : null}
              </div>
            </Link>
          </div>

          {!isManage && <nav className="hidden md:flex flex-none justify-center space-x-1">{renderPublicNav()}</nav>}

          <div className="flex flex-1 items-center justify-end space-x-1.5">
            {effectiveUser && (
              <AccountDisplayTabV1 user={effectiveUser} />
            )}

            {!effectiveUser && (
              <Link href="/profile" className="block">
                <ProfileV1 />
              </Link>
            )}

            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "md:hidden fixed inset-x-0 top-16 z-40 border-t bg-card transition-[clip-path] duration-300 ease-in-out",
          menuOpen ? "pointer-events-auto [clip-path:inset(0_0_0_0)] shadow-[0_8px_24px_0_rgba(0,0,0,0.18)]" : "pointer-events-none [clip-path:inset(0_0_100%_0)] shadow-none"
        )}
      >
        {effectiveUser && (
          <AccountDisplayTabV1 user={effectiveUser} mobile onClick={() => setMenuOpen(false)} />
        )}

        <nav className="flex flex-col space-y-0.5 px-3 py-3">
          {isManage ? renderManageNav() : renderPublicNav()}
        </nav>
      </div>
    </>
  );
}
