"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X, User, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNeupUser, getInitials } from "@/lib/neup-user-context";
import { getAccountDisplayName, getAccountHandle } from "@/lib/account-display";
import { manageNav, getLongestMatchingManageNavHref } from "@/lib/manage-nav";

// ─── Public nav links ─────────────────────────────────────────────────────────

const navLinks = [
  { href: "/sell", label: "Sell" },
  { href: "/agencies", label: "Agencies" },
  { href: "/agents", label: "Agents" },
  { href: "/mortgage/request", label: "Mortgage" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Header() {
  const pathname = usePathname();
  const user = useNeupUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const effectiveUser = user;

  const isManage = pathname.startsWith("/manage");
  const isGuestUser = effectiveUser?.accountType === "guest";
  const displayName = getAccountDisplayName(effectiveUser?.displayName);
  const handleText = getAccountHandle(effectiveUser?.neupId);

  // Close on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Lock / unlock body scroll when shutter is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const renderPublicNav = () =>
    navLinks.map((link) => {
      const isActive = pathname.startsWith(link.href);
      return (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => setMenuOpen(false)}
          className={cn(
            buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "sm" }),
            "w-full justify-start text-sm",
            isActive && "font-semibold"
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
          <p
            key={`h-${i}`}
            className="pt-3 pb-0.5 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider"
          >
            {item.label}
          </p>
        );
      }
      const Icon = item.icon;
      const isActive = getLongestMatchingManageNavHref(pathname) === item.href;
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMenuOpen(false)}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full justify-start transition-[background-color,color] duration-300 ease-in-out hover:bg-primary/5 hover:text-foreground",
            isActive
              ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary font-semibold"
              : "text-foreground/80"
          )}
        >
          <Icon className="mr-2 h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      );
    });

  const UserAvatar = () => (
    <Avatar className="h-8 w-8">
      {effectiveUser ? (
        <>
          <AvatarImage src={effectiveUser?.displayImage || undefined} alt={displayName || "Profile"} />
          <AvatarFallback className="text-xs font-semibold">
            {getInitials(displayName)}
          </AvatarFallback>
        </>
      ) : (
        <AvatarFallback>
          <User className="h-4 w-4" />
        </AvatarFallback>
      )}
    </Avatar>
  );

  return (
    <>
      {/* ── Header bar — always fixed height, never moves ── */}
      <header className="sticky top-0 z-50 w-full bg-card shadow-md">
        <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex-1 flex justify-start">
            <Link href="/" className="flex items-center gap-2">
              <img src="/estate/logo.png" alt="Neup.Estate Logo" className="h-9 w-9 object-contain" />
              <span className="font-bold font-headline text-lg">Neup.Estate</span>
            </Link>
          </div>

          {/* Desktop center nav — public pages only */}
          {!isManage && (
            <nav className="hidden md:flex flex-none justify-center space-x-1">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "sm" }),
                      isActive && "font-semibold",
                      "text-sm"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right side */}
          <div className="flex flex-1 items-center justify-end space-x-1.5">
            {/* Inline name/cta — desktop */}
            {effectiveUser && (
              <Link href="/profile" className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-secondary/60 transition-colors">
                <div className="flex flex-col items-end min-w-0 mr-1">
                  <span className="text-sm font-semibold truncate">{displayName}</span>
                  <span className="text-xs text-muted-foreground">{handleText}</span>
                </div>
                <UserAvatar />
              </Link>
            )}

            {!effectiveUser && (
              <Link href="/profile" className="block">
                <UserAvatar />
              </Link>
            )}

            {/* Burger — mobile only */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/*
        ── Shutter panel ──
        Fixed, starts at top-16 (just below the header bar), covers full remaining
        viewport height. Animates via clip-path — reveals top→bottom like a shutter.
        The bottom edge gets a shadow while open (the "leading edge" of the shutter).
      */}
      <div
        className={cn(
          "md:hidden fixed inset-x-0 top-16 z-40 bg-card border-t",
          "transition-[clip-path] duration-300 ease-in-out",
          menuOpen ? "pointer-events-auto [clip-path:inset(0_0_0_0)] shadow-[0_8px_24px_0_rgba(0,0,0,0.18)]" : "pointer-events-none [clip-path:inset(0_0_100%_0)] shadow-none"
        )}
      >
        {/* User identity */}
        {effectiveUser && (
          <Link
            href="/profile"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 mx-3 mt-3 p-2.5 rounded-lg bg-secondary shrink-0"
          >
            <UserAvatar />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold truncate">{displayName}</span>
                {effectiveUser.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
              </div>
              <span className="text-xs text-muted-foreground">{handleText}</span>
            </div>
          </Link>
        )}

        {/* Scrollable nav */}
        <nav className="px-3 py-3 flex flex-col space-y-0.5">
          {isManage ? renderManageNav() : renderPublicNav()}

          {/* Sign in CTA — public pages only */}
          {!isManage && (
            <div className="pt-3 pb-1">
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className={cn(buttonVariants({ size: "default" }), "w-full")}
              >
                {effectiveUser ? "My Profile" : "Sign In"}
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* Backdrop — tapping outside closes the shutter */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 top-16 z-30"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
