
'use client';

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, type RefObject } from "react";
import type { LoadingBarRef } from "react-top-loading-bar";

export function NavigationEvents({ loadingBarRef }: { loadingBarRef: RefObject<LoadingBarRef> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    loadingBarRef.current?.complete();
  }, [pathname, searchParams, loadingBarRef]);

  return null; // This component is only for running the effect
}
