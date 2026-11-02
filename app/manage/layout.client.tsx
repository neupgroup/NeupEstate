'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Menu } from 'lucide-react';
import { HeaderV1 } from '@neup/components/layout/header.v1';
import { SidebarV1 } from '@neup/components/layout/sidebar.v1';
import { Userbar } from '@neup/components/element/userbar';
import { manageNav } from '@/components/manage-nav';
import { appendWorkingProfileV1, getLongestMatchingManageNavHrefV1 } from '@/components/logic/ManageNavSelection.v1';

type ManageLayoutClientProps = {
  children: React.ReactNode;
  profile: { displayName: string | null; displayImage: string | null; neupId: string | null; workingProfile: string | null };
  permissions: Record<string, boolean>;
};

// Render the same permission-filtered navigation for desktop and mobile.
function ManageNavigation({ permissions, workingProfile, pathname }: {
  permissions: Record<string, boolean>;
  workingProfile: string | null;
  pathname: string;
}) {
  const visibleItems = manageNav.filter(item => item.type === 'heading' || permissions[item.href] !== false);
  const activeHref = getLongestMatchingManageNavHrefV1(pathname, visibleItems);

  return (
    <nav aria-label="Management" className="space-y-1 py-4">
      {visibleItems.map((item, index) => {
        if (item.type === 'heading') {
          return <p key={`heading-${index}`} className="px-3 pt-4 text-xs font-semibold uppercase text-muted-foreground">{item.label}</p>;
        }
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.external ? item.href : appendWorkingProfileV1(item.href, workingProfile)}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener noreferrer' : undefined}
            aria-current={!item.external && activeHref === item.href ? 'page' : undefined}
            onClick={event => event.currentTarget.closest('details')?.removeAttribute('open')}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted ${!item.external && activeHref === item.href ? 'bg-primary/15 font-semibold text-primary' : ''}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Compose the shared header/sidebar layout without mounting another root shell.
export function ManageLayoutClient({ children, profile, permissions }: ManageLayoutClientProps) {
  const pathname = usePathname();
  const navigation = <ManageNavigation permissions={permissions} workingProfile={profile.workingProfile} pathname={pathname} />;

  return (
    <div className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
      <HeaderV1>
        <Link href="/home" className="flex min-w-0 items-center gap-2">
          <Image src="https://cdn.neupgroup.com/neupestate/logo.png" alt="Neup.Estate Logo" width={36} height={36} unoptimized />
          <span className="font-headline text-lg font-bold">Neup.Estate</span>
        </Link>
        <Link href={profile.neupId?.trim() ? `/@${encodeURIComponent(profile.neupId.trim())}` : '/profile'} aria-label="Open profile" className="ml-auto">
          <Userbar displayName={profile.displayName ?? 'User'} displayImage={profile.displayImage} neupid={profile.neupId ?? ''} />
        </Link>
        <details key={pathname} className="ml-2 md:hidden">
          <summary aria-label="Management menu" className="cursor-pointer list-none rounded-lg p-2"><Menu className="h-5 w-5" /></summary>
          <div className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b bg-background px-4 shadow-lg">
            {navigation}
          </div>
        </details>
      </HeaderV1>
      <SidebarV1 sidebar={navigation}>
        {children}
      </SidebarV1>
    </div>
  );
}
