import type { ManageNavItem } from "@/logica/core/manage-nav";

export function normalizePathnameV1(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function getLongestMatchingManageNavHrefV1(pathname: string, navItems: ManageNavItem[]) {
  const normalizedPathname = normalizePathnameV1(pathname);

  return navItems
    .filter((item): item is Extract<ManageNavItem, { type: "link" }> => item.type === "link")
    .map((item) => item.href)
    .filter((href) => {
      if (normalizedPathname === href) return true;
      return normalizedPathname.startsWith(`${href}/`);
    })
    .sort((a, b) => b.length - a.length)[0];
}

export function appendSelectedAgencyV1(href: string, selectedAgency?: string | null) {
  if (!selectedAgency) return href;

  const url = new URL(href, "http://local");
  url.searchParams.set("selectedAgency", selectedAgency);
  return `${url.pathname}${url.search}`;
}

