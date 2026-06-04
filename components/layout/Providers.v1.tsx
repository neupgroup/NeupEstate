"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HeaderLayoutV1 } from "@/components/layout/HeaderLayout.v1";
import { FooterLayoutV1 } from "@/components/layout/FooterLayout.v1";
import { NeupUserProvider, type NeupUser } from "@/logica/core/neup-user-context";
import { GuestSigninBanner } from "@/components/layout/guest-signin-banner";

export function ProvidersV1({
  children,
  initialUser,
  showManagePanelLink,
  showGuestBanner,
}: {
  children: ReactNode;
  initialUser?: NeupUser | null;
  showManagePanelLink?: boolean;
  showGuestBanner?: boolean;
}) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/manage");
  const isHomePage = pathname === "/";
  const isCustomBannerPage = pathname === "/profile" || pathname === "/agents" || pathname.startsWith("/mortgage");

  return (
    <NeupUserProvider initialUser={initialUser ?? null}>
      <HeaderLayoutV1 />
      {showGuestBanner && !isAdminPage && !isHomePage && !isCustomBannerPage && <GuestSigninBanner variant="inline" />}
      {children}
      {!isAdminPage && <FooterLayoutV1 showManagePanelLink={showManagePanelLink ?? false} />}
    </NeupUserProvider>
  );
}

