"use client";

import { useEffect, type RefObject } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { LoadingBarRef } from "react-top-loading-bar";

export function NavigationEventsV1({ loadingBarRef }: { loadingBarRef: RefObject<LoadingBarRef> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    loadingBarRef.current?.complete();
  }, [pathname, searchParams, loadingBarRef]);

  return null;
}

