
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navLinks = [
  { href: "/sell", label: "Sell" },
  { href: "/agencies", label: "Agencies" },
  { href: "/agents", label: "Agents" },
  { href: "/mortgage/request", label: "Mortgage" },
];
 
export default function Header() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Placeholder for auth logic

  const renderNavLinks = (isMobile = false) =>
    navLinks.map((link) => {
      const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
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

  return (
    <header className="sticky top-0 z-50 w-full bg-card shadow-md">
      <div className="container flex h-16 items-center px-4 sm:px-6 lg:px-8">
        {/* Left */}
        <div className="flex-1 flex justify-start">
            <Link href="/" className="flex items-center">
            <span className="font-bold font-headline text-lg">NeupEstate</span>
            </Link>
        </div>

        {/* Center */}
        <nav className="hidden md:flex flex-none justify-center space-x-1">
          {renderNavLinks()}
        </nav>

        {/* Right */}
        <div className="flex flex-1 items-center justify-end space-x-4">
            <Link href="/profile" className="hidden sm:block">
                <Avatar>
                    {isLoggedIn ? (
                        <>
                            <AvatarImage src="https://placehold.co/40x40.png" alt="User Account" data-ai-hint="user avatar" />
                            <AvatarFallback>A</AvatarFallback>
                        </>
                    ) : (
                        <AvatarFallback>
                            <User className="h-5 w-5" />
                        </AvatarFallback>
                    )}
                </Avatar>
            </Link>
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
                    <Link href="/" className="mb-4 flex items-center">
                        <span className="font-bold font-headline text-lg">NeupEstate</span>
                    </Link>
                    <div className="flex flex-col space-y-1">
                      {renderNavLinks(true)}
                    </div>
                    <div className="pt-4">
                        <Link href="/profile" className={cn(buttonVariants({ size: 'default' }), "w-full")}>
                          {isLoggedIn ? 'Profile' : 'Login'}
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
