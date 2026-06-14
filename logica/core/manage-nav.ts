import type { ComponentType } from "react";
import {
  Home, Users, Settings, UserCog,
  LayoutDashboard, LineChart, Package, MessageSquareHeart, FileQuestion, Landmark, CalendarCheck,
  Banknote, HelpCircle, Contact, FileSearch, Link2,
  Lightbulb, Eye, Bell, LifeBuoy, Bookmark, Star, Flame, BarChart2, UserCheck,
  Plus,
} from "lucide-react";

export type ManageNavItem =
  | { type: "link"; href: string; label: string; icon: ComponentType<{ className?: string }> }
  | { type: "heading"; label: string };

export const manageNav: ManageNavItem[] = [
  { type: "link", href: "/manage", label: "Dashboard", icon: LayoutDashboard },
  { type: "link", href: "/manage/analytics", label: "Analytics", icon: LineChart },
  { type: "link", href: "/manage/intelligence", label: "Intelligence", icon: BarChart2 },
  { type: "link", href: "/manage/schedule", label: "Schedule", icon: CalendarCheck },
  { type: "heading", label: "Property" },
  { type: "link", href: "/manage/properties", label: "Properties", icon: Home },
  { type: "link", href: "/manage/collection", label: "Collection", icon: Package },
  { type: "heading", label: "Leads" },
  { type: "link", href: "/manage/leads", label: "Home", icon: Home },
  { type: "link", href: "/manage/leads/add", label: "Add Lead", icon: Plus },
  { type: "link", href: "/manage/leads/my", label: "My Leads", icon: UserCheck },
  { type: "link", href: "/manage/leads/base", label: "Base Leads", icon: Flame },
  { type: "link", href: "/manage/leads/shared", label: "Shared Leads", icon: Users },
  { type: "link", href: "/manage/leads/alerts", label: "Alerts", icon: Bell },
  { type: "heading", label: "CRM" },
  { type: "link", href: "/manage/messages", label: "Messages", icon: MessageSquareHeart },
  { type: "link", href: "/manage/inquiries", label: "Inquiries", icon: FileQuestion },
  { type: "link", href: "/manage/saved", label: "Saved Properties", icon: Bookmark },
  { type: "link", href: "/manage/requests", label: "Property Requests", icon: FileSearch },
  { type: "link", href: "/manage/sales-requests", label: "Sales Request", icon: Landmark },
  { type: "link", href: "/manage/visit-requests", label: "Visit Request", icon: CalendarCheck },
  { type: "link", href: "/manage/mortgage-requests", label: "Mortgage Request", icon: Banknote },
  { type: "link", href: "/manage/contact", label: "Contact", icon: Contact },
  { type: "heading", label: "About" },
  { type: "link", href: "/manage/reviews", label: "Reviews", icon: Star },
  { type: "link", href: "/manage/faq", label: "FAQs", icon: HelpCircle },
  { type: "link", href: "/manage/notifications", label: "Notifications", icon: Bell },
  { type: "heading", label: "Content" },
  { type: "link", href: "/manage/market-insights", label: "Market Insights", icon: Lightbulb },
  { type: "link", href: "/manage/competition", label: "Competition", icon: Eye },
  { type: "heading", label: "Management" },
  { type: "link", href: "/manage/agency", label: "My Agency", icon: Home },
  { type: "link", href: "/manage/agents", label: "Agents", icon: Users },
  { type: "link", href: "/manage/team", label: "Team", icon: Users },
  { type: "link", href: "/manage/agentmap", label: "Agent Map", icon: Link2 },
  { type: "link", href: "/manage/accounts", label: "Users", icon: UserCog },
  { type: "link", href: "/manage/settings", label: "Settings", icon: Settings },
  { type: "link", href: "/manage/support", label: "Support", icon: LifeBuoy },
];

export function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function getLongestMatchingManageNavHref(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  return manageNav
    .filter((item): item is Extract<ManageNavItem, { type: "link" }> => item.type === "link")
    .map((item) => item.href)
    .filter((href) => {
      if (normalizedPathname === href) return true;
      return normalizedPathname.startsWith(`${href}/`);
    })
    .sort((a, b) => b.length - a.length)[0];
}

export function appendSelectedAgency(href: string, selectedAgency?: string | null) {
  if (!selectedAgency) return href;

  const url = new URL(href, "http://local");
  url.searchParams.set("selectedAgency", selectedAgency);
  return `${url.pathname}${url.search}`;
}
