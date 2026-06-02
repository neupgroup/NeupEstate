"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLongestMatchingManageNavHref, manageNav } from "@/lib/manage-nav";

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
  const pathname = usePathname();
  const activeHref = getLongestMatchingManageNavHref(pathname);

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
      <nav className="flex min-h-0 flex-1 flex-col space-y-1 overflow-y-auto p-4">
        {manageNav.map((item, index) => {
          if (item.type === "heading") {
            return (
              <h3 key={`${item.label}-${index}`} className="pt-4 pb-1 px-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
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
                href={item.href}
                className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start transition-[background-color,color] duration-300 ease-in-out hover:bg-primary/5 hover:text-foreground",
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
      </nav>
    </aside>
  );
}
