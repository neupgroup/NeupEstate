"use client";

import * as React from "react";

function PropertyImageTile({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = React.useState(false);

  if (!src || failed) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Deleted
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="aspect-square w-full rounded-lg border object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function PropertyImageGrid({
  images,
  label,
  emptyLabel = "None",
}: {
  images: string[];
  label?: string;
  emptyLabel?: string;
}) {
  return (
    <div className="space-y-2">
      {label && <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>}
      {images.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((src, index) => (
            <PropertyImageTile key={`${src}-${index}`} src={src} alt={`${label || "Image"} ${index + 1}`} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
