"use client";

import * as React from "react";

type ImageStatus = "added" | "removed";

function ImageDiffTile({ src, status }: { src: string; status: ImageStatus }) {
  const [failed, setFailed] = React.useState(false);

  const badgeClass = status === "added" ? "bg-emerald-500 text-white" : "bg-red-500 text-white";
  const badgeText = status === "added" ? "+" : "-";

  if (!src || failed) {
    return (
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Deleted
        <div className={`absolute left-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${badgeClass}`}>
          {badgeText}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border ${status === "removed" ? "opacity-70" : ""}`}>
      <img
        src={src}
        alt={status === "added" ? "Added image" : "Removed image"}
        loading="lazy"
        className="aspect-square w-full object-cover"
        onError={() => setFailed(true)}
      />
      <div className={`absolute left-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold shadow-sm ${badgeClass}`}>
        {badgeText}
      </div>
    </div>
  );
}

export function PropertyImageDiffGrid({
  items,
  emptyLabel = "No image changes recorded",
}: {
  items: Array<{ src: string; status: ImageStatus }>;
  emptyLabel?: string;
}) {
  return items.length ? (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, index) => (
        <ImageDiffTile key={`${item.status}-${item.src}-${index}`} src={item.src} status={item.status} />
      ))}
    </div>
  ) : (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-sm text-muted-foreground">
      {emptyLabel}
    </div>
  );
}
