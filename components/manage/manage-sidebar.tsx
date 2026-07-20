"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/core/utils";
import { manageNav } from "@/components/manage-nav";
import { appendManageProfileParamV1, getLongestMatchingManageNavHrefV1 } from "@/components/logic/ManageNavSelection.v1";

type Props = {
  canDashboard: boolean;
  canAnalytics: boolean;
  canIntelListings: boolean;
  canPropertyView: boolean;
  canRootPropertiesView: boolean;
  canCollectionView: boolean;
  canAccountsView: boolean;
  canLeadsHomeView: boolean;
  canLeadsView?: boolean;
  canLeadsBaseView: boolean;
  canLeadsMyView: boolean;
  canLeadsSharedView: boolean;
  canLeadsAlertsView: boolean;
  canReviewsView: boolean;
  canFaqView: boolean;
  canAgentMapView: boolean;
  canNotificationView: boolean;
};

export function ManageSidebar(props: Props) {
  const [isPointerInside, setIsPointerInside] = useState(false);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeHref = getLongestMatchingManageNavHrefV1(pathname, manageNav);
  const selectedProfile = searchParams.get("selectedProfile");
  const workingProfile = searchParams.get("workingProfile");

  const permissionMap: Record<string, boolean> = {
    "/manage": props.canDashboard,
    "/manage/analytics": props.canAnalytics,
    "/manage/intelligence": props.canIntelListings,
    "/manage/properties": props.canPropertyView || props.canRootPropertiesView,
    "/manage/collection": props.canCollectionView,
    "/manage/accounts": props.canAccountsView,
    "/manage/leads": props.canLeadsHomeView,
    "/manage/leads/add": props.canLeadsHomeView,
    "/manage/leads/base": props.canLeadsBaseView,
    "/manage/leads/my": props.canLeadsMyView,
    "/manage/leads/shared": props.canLeadsSharedView,
    "/manage/leads/alerts": props.canLeadsAlertsView,
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
                  href={item.external ? item.href : appendManageProfileParamV1(item.href, { selectedProfile, workingProfile })}
                  className={cn(
                    buttonVariants({ variant: "plain" }),
                    "group w-full justify-start px-4 py-2 text-left focus-visible:bg-primary/10 focus-visible:text-primary focus-visible:ring-0",
                    isActive
                      ? "bg-primary/15 text-primary hover:bg-primary/20 active:bg-primary/25 font-semibold"
                      : "text-foreground/80"
                  )}
                >
                <Icon className="mr-2 h-4 w-4" />
                <span className="min-w-0 truncate">{item.label}</span>
                {item.external && <ExternalLink className="ml-1 h-3.5 w-3.5 shrink-0" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
