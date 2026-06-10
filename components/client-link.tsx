
'use client';

import Link, { type LinkProps } from 'next/link';
import type { AnchorHTMLAttributes, ReactNode, RefAttributes } from 'react';

type ClientLinkProps = LinkProps & AnchorHTMLAttributes<HTMLAnchorElement> & RefAttributes<HTMLAnchorElement> & {
    children: ReactNode;
    'aria-disabled'?: boolean;
};

export function ClientLink({ children, className, ...props }: ClientLinkProps) {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Prevent navigation if the link is disabled
        if (props['aria-disabled']) {
            e.preventDefault();
            return;
        }
    };
    
    return (
        <Link {...props} className={className} onClick={handleClick}>
            {children}
        </Link>
    );
}
