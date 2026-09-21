"use client";

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { PropertyQA } from "@/components/property-q-a";

type ResponsivePropertyQAProps = ComponentProps<typeof PropertyQA>;

export function ResponsivePropertyQA(props: ResponsivePropertyQAProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  if (!isMobile) return null;

  return <PropertyQA {...props} flat />;
}
