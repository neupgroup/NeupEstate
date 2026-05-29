
'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { NeupUserProvider, type NeupUser } from '@/lib/neup-user-context';
import { GuestSigninBanner } from '@/components/layout/guest-signin-banner';

export function Providers({
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

    const isAdminPage = pathname.startsWith('/manage');
    const isHomePage = pathname === '/';
    const isCustomBannerPage = pathname === '/profile' || pathname === '/agents' || pathname.startsWith('/mortgage');

    return (
        <NeupUserProvider initialUser={initialUser ?? null}>
            <Header />
            {showGuestBanner && !isAdminPage && !isHomePage && !isCustomBannerPage && <GuestSigninBanner variant="inline" />}
            {children}
            {!isAdminPage && <Footer showManagePanelLink={showManagePanelLink ?? false} />}
        </NeupUserProvider>
    );
}
