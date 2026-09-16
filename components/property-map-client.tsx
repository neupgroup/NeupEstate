"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const ClientPropertyMap = dynamic(
  () => import("@/components/property-map").then((module) => module.PropertyMap),
  { ssr: false },
);

export function PropertyMapClient(props: ComponentProps<typeof ClientPropertyMap>) {
  return <ClientPropertyMap {...props} />;
}
