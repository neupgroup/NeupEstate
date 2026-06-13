"use client";

import * as React from "react";

function PropertyImageTile({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = React.useState(false);

  if (!src || failed) {
    return (
      <div className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Deleted
        <div className="pointer-events-none absolute inset-0 bg-primary/0 transition duration-300 group-hover:bg-primary/20" />
      </div>
    );
  }

  return (
    <div className="group relative h-20 w-20 overflow-hidden rounded-lg border">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
        onError={() => setFailed(true)}
      />
      <div className="pointer-events-none absolute inset-0 bg-primary/0 transition duration-300 group-hover:bg-primary/20" />
    </div>
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
        <div className="flex flex-wrap gap-2">
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
