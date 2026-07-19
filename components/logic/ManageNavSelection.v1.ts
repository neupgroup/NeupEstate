import type { ManageNavItem } from "@/components/manage-nav";

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

export function appendWorkingProfileV1(href: string, workingProfile?: string | null) {
  if (!workingProfile) return href;

  const url = new URL(href, "http://local");
  url.searchParams.set("workingProfile", workingProfile);
  return url.origin === "http://local" ? `${url.pathname}${url.search}` : url.toString();
}

export function appendManageProfileParamV1(
  href: string,
  params: { selectedProfile?: string | null; workingProfile?: string | null },
) {
  const selectedProfile = params.selectedProfile?.trim();
  const workingProfile = params.workingProfile?.trim();
  const url = new URL(href, "http://local");

  if (selectedProfile) {
    url.searchParams.set("selectedProfile", selectedProfile);
  } else if (workingProfile) {
    url.searchParams.set("workingProfile", workingProfile);
  }

  return url.origin === "http://local" ? `${url.pathname}${url.search}` : url.toString();
}
