"use client";

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { ListingQA } from "@/components/property-q-a";

type ResponsiveListingQAProps = ComponentProps<typeof ListingQA>;

export function ResponsiveListingQA(props: ResponsiveListingQAProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  if (!isMobile) return null;

  return <ListingQA {...props} flat />;
}
