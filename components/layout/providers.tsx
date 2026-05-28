
'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { NeupUserProvider, type NeupUser } from '@/lib/neup-user-context';

export function Providers({
    children,
    initialUser,
}: {
    children: ReactNode;
    initialUser?: NeupUser | null;
}) {
    const pathname = usePathname();

    const isAdminPage = pathname.startsWith('/manage');

    return (
        <NeupUserProvider initialUser={initialUser ?? null}>
            <Header />
            {children}
            {!isAdminPage && <Footer />}
        </NeupUserProvider>
    );
}
