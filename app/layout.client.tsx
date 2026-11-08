"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { HeaderLayoutV1 } from "@/components/layout/HeaderLayout.v1";
import { FooterLayoutV1 } from "@/components/layout/FooterLayout.v1";
import { SessionProvider, type SessionUser } from "@neup/core/providers/session";
import { GuestSigninBanner } from "@/components/layout/guest-signin-banner";
import { DisplayPreferencesProvider } from '@/components/display-preferences';
import type { DisplayConfiguration } from '@/services/preferences/display';

// Supply session state and the public shell around route content.
export function LayoutClient({
  children,
  initialUser,
  displayConfiguration,
  showManagePanelLink,
  showGuestBanner,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
  displayConfiguration: DisplayConfiguration;
  showManagePanelLink?: boolean;
  showGuestBanner?: boolean;
}) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/manage");
  const shouldShowFooter = !isAdminPage;
  const isHomePage = pathname === "/home";
  const isCustomBannerPage = pathname === "/profile" || pathname === "/agents" || pathname.startsWith("/mortgage");

  return (
    <DisplayPreferencesProvider configuration={displayConfiguration}>
      <SessionProvider initialUser={initialUser ?? null}>
        {!isAdminPage && <HeaderLayoutV1 />}
        {showGuestBanner && !isAdminPage && !isHomePage && !isCustomBannerPage && <GuestSigninBanner variant="inline" />}
        {children}
        {shouldShowFooter && <FooterLayoutV1 showManagePanelLink={showManagePanelLink ?? false} />}
        {Object.keys(displayConfiguration.usdRates).length > 1 && (
          <p className="pb-2 text-center text-[10px] text-muted-foreground">
            Currency conversions use daily reference rates from{' '}
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="underline">ExchangeRate-API</a>.
          </p>
        )}
      </SessionProvider>
    </DisplayPreferencesProvider>
  );
}
