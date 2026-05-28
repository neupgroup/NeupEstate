"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X, User, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNeupUser, getInitials } from "@/lib/neup-user-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home, Users, Settings, UserCog,
  LayoutDashboard, LineChart, Package, MessageSquareHeart, FileQuestion, Landmark, CalendarCheck,
  Banknote, HelpCircle, Contact, FileSearch,
  Lightbulb, UserCheck, Eye, Bell, LifeBuoy, Bookmark, Star, Flame, BarChart2,
} from "lucide-react";

// ─── Public nav links ─────────────────────────────────────────────────────────

const navLinks = [
  { href: "/sell", label: "Sell" },
  { href: "/agencies", label: "Agencies" },
  { href: "/agents", label: "Agents" },
  { href: "/mortgage/request", label: "Mortgage" },
];

// ─── Manage sidebar nav (mirrors app/manage/layout.tsx) ───────────────────────

type ManageNavItem =
  | { type: "link"; href: string; label: string; icon: React.ElementType }
  | { type: "heading"; label: string };

const manageNav: ManageNavItem[] = [
  { type: "link",    href: "/manage",                   label: "Dashboard",         icon: LayoutDashboard },
  { type: "link",    href: "/manage/analytics",         label: "Analytics",         icon: LineChart },
  { type: "link",    href: "/manage/intelligence",      label: "Intelligence",      icon: BarChart2 },
  { type: "link",    href: "/manage/schedule",          label: "Schedule",          icon: CalendarCheck },

  { type: "heading", label: "Property" },
  { type: "link",    href: "/manage/properties",        label: "Properties",        icon: Home },
  { type: "link",    href: "/manage/collection",        label: "Collection",        icon: Package },

  { type: "heading", label: "Clients" },
  { type: "link",    href: "/manage/leads",             label: "Leads",             icon: Flame },
  { type: "link",    href: "/manage/clients",           label: "Clients",           icon: UserCheck },
  { type: "link",    href: "/manage/messages",          label: "Messages",          icon: MessageSquareHeart },
  { type: "link",    href: "/manage/inquiries",         label: "Inquiries",         icon: FileQuestion },
  { type: "link",    href: "/manage/saved",             label: "Saved Properties",  icon: Bookmark },
  { type: "link",    href: "/manage/requests",          label: "Property Requests", icon: FileSearch },
  { type: "link",    href: "/manage/sales-requests",    label: "Sales Request",     icon: Landmark },
  { type: "link",    href: "/manage/visit-requests",    label: "Visit Request",     icon: CalendarCheck },
  { type: "link",    href: "/manage/mortgage-requests", label: "Mortgage Request",  icon: Banknote },
  { type: "link",    href: "/manage/contact",           label: "Contact",           icon: Contact },

  { type: "heading", label: "About" },
  { type: "link",    href: "/manage/reviews",           label: "Reviews",           icon: Star },
  { type: "link",    href: "/manage/faq",               label: "FAQs",              icon: HelpCircle },
  { type: "link",    href: "/manage/notifications",     label: "Notifications",     icon: Bell },

  { type: "heading", label: "Content" },
  { type: "link",    href: "/manage/market-insights",   label: "Market Insights",   icon: Lightbulb },
  { type: "link",    href: "/manage/competition",       label: "Competition",       icon: Eye },

  { type: "heading", label: "Management" },
  { type: "link",    href: "/manage/agents",            label: "Agents",            icon: Users },
  { type: "link",    href: "/manage/users",             label: "Users",             icon: UserCog },
  { type: "link",    href: "/manage/settings",          label: "Settings",          icon: Settings },
  { type: "link",    href: "/manage/support",           label: "Support",           icon: LifeBuoy },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Header() {
  const pathname = usePathname();
  const user = useNeupUser();
  const [menuOpen, setMenuOpen] = useState(false);

  const effectiveUser = user;

  const isManage = pathname.startsWith("/manage");
  const displayName = effectiveUser?.displayName?.trim() ? effectiveUser.displayName : "Guest User";
  const handleText = effectiveUser?.neupId?.trim() ? `@${effectiveUser.neupId}` : "Sign In Now";

  useEffect(() => {
    console.log("[Header] computed identity:", {
      pathname,
      isManage,
      hasUser: !!user,
      hasEffectiveUser: !!effectiveUser,
      user,
      effectiveUser,
      displayName,
      handleText,
    });
  }, [pathname, isManage, user, effectiveUser, displayName, handleText]);

  // Close on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // DEBUG: log the current user object and sessionStorage entry
  useEffect(() => {
    try {
      console.log('Header user (useNeupUser):', user);
      console.log('Header session neup_user:', sessionStorage.getItem('neup_user'));
    } catch (err) {
      // ignore in non-browser environments
    }
  }, [user]);

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
      const isActive =
        item.href === "/manage"
          ? pathname === "/manage"
          : pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMenuOpen(false)}
          className={cn(
            buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "sm" }),
            "w-full justify-start",
            isActive && "font-semibold"
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
          {console.log("[Header] rendering UserAvatar with user:", effectiveUser)}
          <AvatarImage src={effectiveUser?.displayImage || undefined} alt={effectiveUser?.displayName} />
          <AvatarFallback className="text-xs font-semibold">
            {getInitials(effectiveUser?.displayName ?? "")}
          </AvatarFallback>
        </>
      ) : (
        console.log("[Header] rendering UserAvatar without user"),
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
              <img src="/estate/logo.png" alt="Neup.Estate Logo" className="h-7 w-7 object-contain" />
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
          <div className="flex flex-1 items-center justify-end space-x-3">
            {/* Avatar + tooltip — desktop */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/profile" className="block">
                    <UserAvatar />
                  </Link>
                </TooltipTrigger>
                {effectiveUser && (
                  <TooltipContent side="bottom" align="end" className="p-3 max-w-[220px]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm truncate">{displayName}</span>
                        {effectiveUser.verified && <BadgeCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </div>
                      <span className="text-xs text-muted-foreground">{handleText}</span>
                      <span className="text-xs text-muted-foreground capitalize">{effectiveUser.accountType}</span>
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>

            {/* Inline name/cta — desktop */}
            {effectiveUser && (
              <div className="flex flex-col items-end mr-2">
                <Link href="/profile" className="text-sm font-semibold truncate">
                  {displayName}
                </Link>
                <span className="text-xs text-muted-foreground">{handleText}</span>
              </div>
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
