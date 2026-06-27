"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Grid2x2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PropertyMediaGalleryProps {
  images: string[];
  title: string;
}

function GalleryImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground ${
          className || ""
        }`}
      >
        No image
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export function PropertyMediaGallery({
  images,
  title,
}: PropertyMediaGalleryProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const visibleImages = useMemo(
    () =>
      images.filter(
        (image) =>
          typeof image === "string" && image.trim().length > 0
      ),
    [images]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!visibleImages.length) {
    return (
      <div className="rounded-3xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        No photos available.
      </div>
    );
  }

  const first = visibleImages[0];
  const second = visibleImages[1];
  const third = visibleImages[2];
  const fourth = visibleImages[3];
  const fifth = visibleImages[4];
  const extraCount = Math.max(0, visibleImages.length - 6);

  function MediaTile({
    src,
    alt,
    className,
    overlay,
  }: {
    src: string;
    alt: string;
    className: string;
    overlay?: ReactNode;
  }) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block h-full min-h-0 min-w-0 overflow-hidden bg-muted ${className}`}
      >
        <GalleryImage
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />

        <div className="pointer-events-none absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/45" />

        {overlay}
      </button>
    );
  }

  function renderCollage() {
    if (visibleImages.length === 1) {
      return (
        <MediaTile
          src={first}
          alt={`${title} photo 1`}
          className="rounded-3xl"
        />
      );
    }

    if (visibleImages.length === 2) {
      return (
        <div className="grid h-full min-h-0 grid-cols-2 gap-2 rounded-3xl">
          <MediaTile
            src={first}
            alt={`${title} photo 1`}
            className="rounded-l-3xl"
          />

          <MediaTile
            src={second}
            alt={`${title} photo 2`}
            className="rounded-r-3xl"
          />
        </div>
      );
    }

    if (visibleImages.length === 3) {
      return (
        <div className="grid h-full min-h-0 grid-cols-2 gap-2 rounded-3xl">
          <MediaTile
            src={first}
            alt={`${title} photo 1`}
            className="rounded-l-3xl"
          />

          <div className="grid min-h-0 grid-rows-2 gap-2">
            <MediaTile
              src={second}
              alt={`${title} photo 2`}
              className="rounded-tr-3xl"
            />

            <MediaTile
              src={third}
              alt={`${title} photo 3`}
              className="rounded-br-3xl"
            />
          </div>
        </div>
      );
    }

    if (visibleImages.length === 4) {
      return (
        <div className="grid h-full min-h-0 grid-cols-2 gap-2 rounded-3xl">
          <MediaTile
            src={first}
            alt={`${title} photo 1`}
            className="rounded-l-3xl"
          />

          <div className="grid min-h-0 grid-rows-2 gap-2">
            <MediaTile
              src={second}
              alt={`${title} photo 2`}
              className="rounded-tr-3xl"
            />

            <div className="grid min-h-0 grid-cols-2 gap-2">
              <MediaTile
                src={third}
                alt={`${title} photo 3`}
                className=""
              />

              <MediaTile
                src={fourth}
                alt={`${title} photo 4`}
                className="rounded-br-3xl"
              />
            </div>
          </div>
        </div>
      );
    }

    if (visibleImages.length === 5) {
      return (
        <div className="grid h-full min-h-0 grid-cols-2 gap-2 rounded-3xl">
          <MediaTile
            src={first}
            alt={`${title} photo 1`}
            className="rounded-l-3xl"
          />

          <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-2">
            <MediaTile
              src={second}
              alt={`${title} photo 2`}
              className=""
            />

            <MediaTile
              src={third}
              alt={`${title} photo 3`}
              className="rounded-tr-3xl"
            />

            <MediaTile
              src={fourth}
              alt={`${title} photo 4`}
              className=""
            />

            <MediaTile
              src={fifth}
              alt={`${title} photo 5`}
              className="rounded-br-3xl"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="grid h-full min-h-0 grid-cols-2 gap-2 rounded-3xl">
        <MediaTile
          src={first}
          alt={`${title} photo 1`}
          className="rounded-l-3xl"
        />

        <div className="grid min-h-0 grid-rows-2 gap-2">
          <div className="grid min-h-0 grid-cols-2 gap-2">
            <MediaTile
              src={second}
              alt={`${title} photo 2`}
              className=""
            />

            <MediaTile
              src={third}
              alt={`${title} photo 3`}
              className="rounded-tr-3xl"
            />
          </div>

          <div className="grid min-h-0 grid-cols-3 gap-2">
            <MediaTile
              src={fourth}
              alt={`${title} photo 4`}
              className=""
            />

            <MediaTile
              src={fifth}
              alt={`${title} photo 5`}
              className=""
            />

            <MediaTile
              src={visibleImages[5]}
              alt={`${title} photo 6`}
              className="rounded-br-3xl"
              overlay={
                extraCount > 0 ? (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/35 transition-colors duration-300 group-hover:bg-black/55">
                    <span className="text-xl font-semibold text-white">
                      +{extraCount}
                    </span>
                  </div>
                ) : undefined
              }
            />
          </div>
        </div>
      </div>
    );
  }

  const collage = (
    <div className="relative h-[320px] min-h-0 overflow-hidden rounded-3xl sm:h-[360px] lg:h-[420px]">
      {renderCollage()}

      {mounted && visibleImages.length > 5 && (
        <DialogTrigger asChild>
          <Button
            variant="secondary"
            className="absolute bottom-4 right-4 z-20 gap-2 rounded-full border border-border/70 bg-background/95 px-4 shadow-lg backdrop-blur hover:bg-background"
          >
            <Grid2x2 className="h-4 w-4" />
            Show all photos
          </Button>
        </DialogTrigger>
      )}
    </div>
  );

  if (!mounted) {
    return collage;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {collage}

      <DialogContent className="max-w-6xl border-0 p-0 sm:rounded-3xl">
        <div className="max-h-[90vh] overflow-hidden bg-background">
          <DialogHeader className="flex-row items-center justify-between border-b px-6 py-4 text-left">
            <div>
              <DialogTitle className="text-xl">{title}</DialogTitle>

              <p className="text-sm text-muted-foreground">
                {visibleImages.length} photo
                {visibleImages.length === 1 ? "" : "s"}
              </p>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-5rem)] overflow-y-auto px-6 py-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleImages.map((src, index) => (
                <a
                  key={`${src}-${index}`}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative overflow-hidden rounded-2xl bg-muted shadow-sm"
                >
                  <div className="aspect-square">
                    <GalleryImage
                      src={src}
                      alt={`${title} photo ${index + 1}`}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.04]"
                    />

                    <div className="pointer-events-none absolute inset-0 bg-black/10 transition-colors duration-300 hover:bg-black/45" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}