"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface PropertyMapProps {
  center?: {
    lat: number;
    lng: number;
  } | null;
  query?: string;
}

function buildEmbedUrl(center?: { lat: number; lng: number } | null, query?: string) {
  if (center && Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
    const delta = 0.01;
    const left = center.lng - delta;
    const bottom = center.lat - delta;
    const right = center.lng + delta;
    const top = center.lat + delta;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${center.lat}%2C${center.lng}`;
  }

  const searchQuery = query?.trim();
  if (searchQuery) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(searchQuery)}`;
  }

  return null;
}

export function PropertyMap({ center, query }: PropertyMapProps) {
  const src = useMemo(() => buildEmbedUrl(center, query), [center, query]);

  if (!src) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <iframe
      title="Property map"
      src={src}
      className="h-[400px] w-full rounded-lg border"
      loading="lazy"
    />
  );
}
