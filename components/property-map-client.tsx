"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const ClientListingMap = dynamic(
  () => import("@/components/property-map").then((module) => module.ListingMap),
  { ssr: false },
);

export function ListingMapClient(props: ComponentProps<typeof ClientListingMap>) {
  return <ClientListingMap {...props} />;
}
