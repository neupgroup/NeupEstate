"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, BadgeCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNeupUser, getInitials } from "@/lib/neup-user-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home, Users, Settings, Building, UserCog,
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

// ─── Manage sidebar nav definition (mirrors app/manage/layout.tsx) ────────────

type ManageNavItem =
  | { type: "link"; href: string; label: string; icon: React.ElementType }
  | { type: "heading"; label: string };

const manageNav: ManageNavItem[] = [
  { type: "link",    href: "/manage",            label: "Dashboard",        icon: LayoutDashboard },
  { type: "link",    href: "/manage/analytics",  label: "Analytics",        icon: LineChart },
  { type: "link",    href: "/manage/intelligence", label: "Intelligence",   icon: BarChart2 },
  { type: "link",    href: "/manage/schedule",   label: "Schedule",         icon: CalendarCheck },

  { type: "heading", label: "Property" },
  { type: "link",    href: "/manage/properties", label: "Properties",       icon: Home },
  { type: "link",    href: "/manage/collection", label: "Collection",       icon: Package },

  { type: "heading", label: "Clients" },
  { type: "link",    href: "/manage/leads",      label: "Leads",            icon: Flame },
  { type: "link",    href: "/manage/clients",    label: "Clients",          icon: UserCheck },
  { type: "link",    href: "/manage/messages",   label: "Messages",         icon: MessageSquareHeart },
  { type: "link",    href: "/manage/inquiries",  label: "Inquiries",        icon: FileQuestion },
  { type: "link",    href: "/manage/saved",      label: "Saved Properties", icon: Bookmark },
  { type: "link",    href: "/manage/requests",   label: "Property Requests",icon: FileSearch },
  { type: "link",    href: "/manage/sales-requests",   label: "Sales Request",   icon: Landmark },
  { type: "link",    href: "/manage/visit-requests",   label: "Visit Request",   icon: CalendarCheck },
  { type: "link",    href: "/manage/mortgage-requests",label: "Mortgage Request",icon: Banknote },
  { type: "link",    href: "/manage/contact",    label: "Contact",          icon: Contact },

  { type: "heading", label: "About" },
  { type: "link",    href: "/manage/reviews",    label: "Reviews",          icon: Star },
  { type: "link",    href: "/manage/faq",        label: "FAQs",             icon: HelpCircle },
  { type: "link",    href: "/manage/notifications", label: "Notifications", icon: Bell },

  { type: "heading", label: "Content" },
  { type: "link",    href: "/manage/market-insights", label: "Market Insights", icon: Lightbulb },
  { type: "link",    href: "/manage/competition",     label: "Competition",     icon: Eye },

  { type: "heading", label: "Management" },
  { type: "link",    href: "/manage/agents",     label: "Agents",           icon: Users },
  { type: "link",    href: "/manage/users",      label: "Users",            icon: UserCog },
  { type: "link",    href: "/manage/settings",   label: "Settings",         icon: Settings },
  { type: "link",    href: "/manage/support",    label: "Support",          icon: LifeBuoy },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function Header() {
  const pathname = usePathname();
  const user = useNeupUser();

  const isManage = pathname.startsWith("/manage");

  const renderNavLinks = (isMobile = false) =>
    navLinks.map((link) => {
      const isActive =
        link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
      return (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            buttonVariants({
              variant: isActive ? "secondary" : "ghost",
              size: "sm",
            }),
            isActive && "font-semibold",
            isMobile ? "w-full justify-start text-base" : "text-sm"
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
      {user ? (
        <>
          <AvatarImage
            src={user.displayImage || undefined}
            alt={user.displayName}
          />
          <AvatarFallback className="text-xs font-semibold">
            {getInitials(user.displayName ?? "")}
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
    <header className="sticky top-0 z-50 w-full bg-card shadow-md">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        {/* Left */}
        <div className="flex-1 flex justify-start">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/estate/logo.png"
              alt="Neup.Estate Logo"
              className="h-7 w-7 object-contain"
            />
            <span className="font-bold font-headline text-lg">Neup.Estate</span>
          </Link>
        </div>

        {/* Center — public nav only (manage has its own sidebar on desktop) */}
        {!isManage && (
          <nav className="hidden md:flex flex-none justify-center space-x-1">
            {renderNavLinks()}
          </nav>
        )}

        {/* Right */}
        <div className="flex flex-1 items-center justify-end space-x-3">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/profile" className="hidden sm:block">
                  <UserAvatar />
                </Link>
              </TooltipTrigger>
              {user && (
                <TooltipContent side="bottom" align="end" className="p-3 max-w-[200px]">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">
                        {user.displayName}
                      </span>
                      {user.verified && (
                        <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      @{user.neupId}
                    </span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {user.accountType}
                    </span>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Burger — always visible on mobile */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-72 p-0 flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-2 px-4 py-4 border-b shrink-0">
                  <img
                    src="/estate/logo.png"
                    alt="Neup.Estate Logo"
                    className="h-7 w-7 object-contain"
                  />
                  <span className="font-bold font-headline text-lg">
                    Neup.Estate
                  </span>
                </div>

                {/* User identity */}
                {user && (
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 mx-3 mt-3 p-2 rounded-lg bg-secondary shrink-0"
                  >
                    <UserAvatar />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-semibold truncate">
                          {user.displayName}
                        </span>
                        {user.verified && (
                          <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        @{user.neupId}
                      </span>
                    </div>
                  </Link>
                )}

                {/* Nav items — scrollable */}
                <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col space-y-0.5">
                  {isManage ? renderManageNav() : renderNavLinks(true)}
                </nav>

                {/* Bottom CTA — only on public pages */}
                {!isManage && (
                  <div className="px-3 pb-4 shrink-0">
                    <Link
                      href="/profile"
                      className={cn(buttonVariants({ size: "default" }), "w-full")}
                    >
                      {user ? "My Profile" : "Sign In"}
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
