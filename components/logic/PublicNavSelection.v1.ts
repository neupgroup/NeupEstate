export function isActivePublicHrefV1(pathname: string, href: string) {
  if (!pathname || !href) return false;
  if (href === "/home") return pathname === "/home";
  return pathname === href || pathname.startsWith(`${href}/`);
}

