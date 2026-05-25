
import type { Metadata } from 'next';
import { Raleway } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/layout/providers';
import { AccountManager } from '@/components/layout/account-manager';
import { ActivityTracker } from '@/components/activity-tracker';
import { createAccount } from '@/services/account/create-account';
import { createAccountInApp } from '@/logica/auth/account';

const raleway = Raleway({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-raleway',
});

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Neup.Estate',
  description: 'A modern, user-friendly real estate website to browse property listings.',
  icons: {
    icon: '/estate/logo.png',
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

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased flex flex-col',
          raleway.variable
        )}
      >
        <AccountManager />
        <ActivityTracker />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
