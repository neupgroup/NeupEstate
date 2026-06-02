"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { appendSelectedAgency, getLongestMatchingManageNavHref, manageNav } from "@/lib/manage-nav";

type Props = {
  canDashboard: boolean;
  canAnalytics: boolean;
  canIntelListings: boolean;
  canPropertyView: boolean;
  canCollectionView: boolean;
  canLeadsView: boolean;
  canClientsView: boolean;
  canReviewsView: boolean;
  canFaqView: boolean;
  canNotificationView: boolean;
};

export function ManageSidebar(props: Props) {
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeHref = getLongestMatchingManageNavHref(pathname);
  const selectedAgency = searchParams.get("selectedAgency");

  const permissionMap: Record<string, boolean> = {
    "/manage": props.canDashboard,
    "/manage/analytics": props.canAnalytics,
    "/manage/intelligence": props.canIntelListings,
    "/manage/properties": props.canPropertyView,
    "/manage/collection": props.canCollectionView,
    "/manage/leads": props.canLeadsView,
    "/manage/clients": props.canClientsView,
    "/manage/reviews": props.canReviewsView,
    "/manage/faq": props.canFaqView,
    "/manage/notifications": props.canNotificationView,
  };

  return (
    <aside className="hidden md:flex sticky top-16 self-start h-[calc(100vh-4rem)] flex-col border-r border-border bg-background">
      <nav
        className="manage-sidebar-scroll flex min-h-0 flex-1 overflow-y-auto"
        data-scrollbar-visible={isScrollbarVisible}
        onMouseEnter={() => setIsPointerInside(true)}
        onMouseLeave={() => {
          setIsPointerInside(false);
          setIsScrollbarVisible(false);
        }}
        onScroll={() => {
          if (isPointerInside) {
            setIsScrollbarVisible(true);
          }
        }}
      >
        <div className="flex min-h-full flex-1 flex-col gap-1 py-4 pr-3">
          {manageNav.map((item, index) => {
            if (item.type === "heading") {
              return (
                <h3 key={`${item.label}-${index}`} className="mt-3 px-4 pb-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider first:mt-0">
                  {item.label}
                </h3>
              );
            }

            if (permissionMap[item.href] === false) return null;

            const Icon = item.icon;
            const isActive = activeHref === item.href;

            return (
                <Link
                  key={item.href}
                  href={appendSelectedAgency(item.href, selectedAgency)}
                  className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "w-full justify-start px-4 py-2 transition-[background-color,color] duration-300 ease-in-out hover:bg-primary/7 hover:text-foreground",
                  isActive
                    ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary font-semibold"
                    : "text-foreground/80"
                )}
              >
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
