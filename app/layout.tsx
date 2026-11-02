
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@neup/core/utils';
import SharedRootLayout from '@neup/components/layout/RootLayout';
import { LayoutClient } from './layout.client';
import { ActivityTracker } from '@/components/activity-tracker';
import { createAccount } from '@/services/accounts/create';
import { getAuthenticatedMeData } from '@/services/auth/me';
import { canShowManagePanelLink } from '@/services/permissions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Neup.Estate',
  description: 'A modern, user-friendly real estate website to browse property listings.',
  icons: {
    icon: 'https://cdn.neupgroup.com/neupestate/logo.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await createAccount();

  const me = await getAuthenticatedMeData();
  const isGuestUser = me?.accountType === 'guest';
  const canShowManagePanel = me ? await canShowManagePanelLink() : false;
  const initialUser = me
      ? {
        accountId: me.accountId,
        neupId: me.neupId ?? (isGuestUser ? 'guest' : undefined),
        displayName: me.displayName ?? (isGuestUser ? 'Guest Account' : undefined),
        displayImage: me.displayImage ?? undefined,
        accountType: me.accountType,
        verified: me.registered,
        workingProfile: me.workingProfile,
        workingProfileDisplayName: me.workingProfileDisplayName ?? undefined,
      }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased flex flex-col',
        )}
      >
        <ActivityTracker />
        <LayoutClient
          initialUser={initialUser}
          showManagePanelLink={canShowManagePanel}
          showGuestBanner={isGuestUser}
        >
          <SharedRootLayout>{children}</SharedRootLayout>
        </LayoutClient>
      </body>
    </html>
  );
}
