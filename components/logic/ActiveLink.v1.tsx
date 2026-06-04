"use client";

export function isLongestMatchingHref(currentPathname: string, href: string) {
  if (!currentPathname || !href) return false;
  if (href === "/") return currentPathname === "/";
  return currentPathname === href || currentPathname.startsWith(`${href}/`);
}

