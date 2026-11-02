"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Kicker } from "@neup/components/ui/text";
import { SidebarMenuButton } from "@neup/components/ui/sidebar";
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
  canAgentMapView: boolean;
  canNotificationView: boolean;
};

export function ManageSidebar(props: Props) {
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
    "/manage/notifications": props.canNotificationView,
  };

  return (
    <nav className="flex flex-col gap-1 pt-6 pb-4" aria-label="Management navigation">
      {manageNav.map((item, index) => {
        if (item.type === "heading") {
          return (
            <Kicker key={`${item.label}-${index}`} className="mt-3 px-4 pb-1 first:mt-0">
              {item.label}
            </Kicker>
          );
        }

        if (permissionMap[item.href] === false) return null;

        const Icon = item.icon;
        const isActive = activeHref === item.href;

        return (
          <SidebarMenuButton
            key={item.href}
            href={item.external ? item.href : appendManageProfileParamV1(item.href, { selectedProfile, workingProfile })}
            active={isActive}
            aria-current={isActive ? "page" : undefined}
            className="px-4 py-2 text-left"
          >
            <Icon aria-hidden="true" />
            <span className="min-w-0 truncate">{item.label}</span>
            {item.external && <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
          </SidebarMenuButton>
        );
      })}
    </nav>
  );
}
