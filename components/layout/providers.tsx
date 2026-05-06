
'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import { NeupUserProvider } from '@/lib/neup-user-context';

export function Providers({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    const isAdminPage = pathname.startsWith('/manage');

    return (
        <NeupUserProvider>
            <Header />
            {children}
            {!isAdminPage && <Footer />}
        </NeupUserProvider>
    );
}
