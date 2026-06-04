export function isActivePublicHrefV1(pathname: string, href: string) {
  if (!pathname || !href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

