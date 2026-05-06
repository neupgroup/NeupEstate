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

const navLinks = [
  { href: "/sell", label: "Sell" },
  { href: "/agencies", label: "Agencies" },
  { href: "/agents", label: "Agents" },
  { href: "/mortgage/request", label: "Mortgage" },
];

export default function Header() {
  const pathname = usePathname();
  const user = useNeupUser();

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

  const UserAvatar = () => (
    <Avatar className="h-8 w-8">
      {user ? (
        <>
          <AvatarImage
            src={user.displayImage || undefined}
            alt={user.displayName}
          />
          <AvatarFallback className="text-xs font-semibold">
            {getInitials(user.displayName)}
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

        {/* Center */}
        <nav className="hidden md:flex flex-none justify-center space-x-1">
          {renderNavLinks()}
        </nav>

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

          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col space-y-4 p-4">
                  <Link href="/" className="mb-4 flex items-center gap-2">
                    <img
                      src="/estate/logo.png"
                      alt="Neup.Estate Logo"
                      className="h-7 w-7 object-contain"
                    />
                    <span className="font-bold font-headline text-lg">
                      Neup.Estate
                    </span>
                  </Link>

                  {/* User identity in mobile menu */}
                  {user && (
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 p-2 rounded-lg bg-secondary"
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

                  <div className="flex flex-col space-y-1">
                    {renderNavLinks(true)}
                  </div>
                  <div className="pt-4">
                    <Link
                      href="/profile"
                      className={cn(
                        buttonVariants({ size: "default" }),
                        "w-full"
                      )}
                    >
                      {user ? "My Profile" : "Sign In"}
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
