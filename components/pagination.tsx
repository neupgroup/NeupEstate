
'use client';

import { useSearchParams, usePathname } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClientLink } from './client-link';

interface PaginationProps {
  totalPages: number;
  currentPage: number;
}

export function Pagination({ totalPages, currentPage }: PaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  if (totalPages <= 1) {
    return null;
  }

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNumber.toString());
    const querySegment = pathname.split('?')[0];
    return `${querySegment}?${params.toString()}`;
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const pagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + pagesToShow - 1);

    if (endPage - startPage + 1 < pagesToShow) {
        startPage = Math.max(1, endPage - pagesToShow + 1);
    }
    
    if (startPage > 1) {
      pageNumbers.push(
        <ClientLink href={createPageURL(1)} key="1" className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
          1
        </ClientLink>
      );
      if (startPage > 2) {
          pageNumbers.push(<span key="start-ellipsis" className="px-2">...</span>);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <ClientLink
          href={createPageURL(i)}
          key={i}
          className={cn(
            buttonVariants({
              variant: currentPage === i ? 'outline' : 'ghost',
              size: 'icon',
            }),
            currentPage === i && 'pointer-events-none bg-accent'
          )}
          aria-disabled={currentPage === i}
        >
          {i}
        </ClientLink>
      );
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pageNumbers.push(<span key="end-ellipsis" className="px-2">...</span>);
        }
        pageNumbers.push(
          <ClientLink href={createPageURL(totalPages)} key={totalPages} className={buttonVariants({ variant: 'ghost', size: 'icon' })}>
            {totalPages}
          </ClientLink>
        );
    }

    return pageNumbers;
  };

  return (
    <div className="flex items-center justify-center space-x-1 py-4">
      <ClientLink
        href={createPageURL(currentPage - 1)}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          currentPage <= 1 && 'pointer-events-none opacity-50'
        )}
        aria-disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous Page</span>
      </ClientLink>
      {renderPageNumbers()}
      <ClientLink
        href={createPageURL(currentPage + 1)}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          currentPage >= totalPages && 'pointer-events-none opacity-50'
        )}
        aria-disabled={currentPage >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next Page</span>
      </ClientLink>
    </div>
  );
}
