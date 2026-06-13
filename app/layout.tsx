
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { cn } from '@/logica/core/utils';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/layout/providers';
import { ActivityTracker } from '@/components/activity-tracker';
import { createAccount } from '@/services/account/create-account';
import { createAccountInApp } from '@/logica/auth/account';
import { getAuthenticatedMeData } from '@/services/auth/me';
import { hasPermission } from '@/logica/auth/authorization';
import { PERMISSIONS } from '@/logica/auth/permissions';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
});

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
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth_account')?.value ?? null;

  if (authCookie) {
    await createAccountInApp(authCookie).catch(() => null);
  }

  // Ensure an account row exists for every request — runs server-side,
  // no client JS needed. Uses the x-account-id header set by proxy.ts.
  await createAccount();

  const me = await getAuthenticatedMeData();
  const isGuestUser = me?.accountType === 'guest';
  const canShowManagePanel = me
    ? (await Promise.all(
        [
          ...Object.values(PERMISSIONS.manage),
          ...Object.values(PERMISSIONS.root),
        ].map((permission) => hasPermission(permission))
      )).some(Boolean)
    : false;
  const initialUser = me
    ? {
        accountId: me.accountId,
        neupId: me.neupId ?? (isGuestUser ? 'guest' : undefined),
        displayName: me.displayName ?? (isGuestUser ? 'Guest Account' : undefined),
        displayImage: me.displayImage ?? undefined,
        accountType: me.accountType,
        verified: me.registered,
      }
    : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased flex flex-col',
          outfit.variable
        )}
      >
        <ActivityTracker />
        <Providers
          initialUser={initialUser}
          showManagePanelLink={canShowManagePanel}
          showGuestBanner={isGuestUser}
        >
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
