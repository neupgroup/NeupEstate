"use client";

export function isLongestMatchingHref(currentPathname: string, href: string) {
  if (!currentPathname || !href) return false;
  if (href === "/home") return currentPathname === "/home";
  return currentPathname === href || currentPathname.startsWith(`${href}/`);
}

