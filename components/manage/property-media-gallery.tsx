"use client";

/*
::neup.documentation::property-media-gallery

Renders a collage-style property photo gallery that links to the full-page gallery route.

::end
*/

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Grid2x2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PropertyMediaGalleryProps {
  images: string[];
  title: string;
  propertySlug: string;
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

  useEffect(() => {
    setFailed(false);
  }, [src]);

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
  propertySlug,
}: PropertyMediaGalleryProps) {
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

  const getGalleryHref = (index: number) =>
    `/properties/${propertySlug}/gallery?mode=fullpage&image=${index + 1}`;
  const galleryHref = `/properties/${propertySlug}/gallery`;

  const first = visibleImages[0];
  const second = visibleImages[1];
  const third = visibleImages[2];
  const fourth = visibleImages[3];
  const fifth = visibleImages[4];
  const extraCount = Math.max(0, visibleImages.length - 6);

  function MediaTile({
    src,
    alt,
    index,
    className,
    overlay,
  }: {
    src: string;
    alt: string;
    index: number;
    className: string;
    overlay?: ReactNode;
  }) {
    return (
      <Link
        href={getGalleryHref(index)}
        className={`group relative block h-full w-full min-h-0 min-w-0 overflow-hidden bg-muted ${className}`}
      >
        <GalleryImage
          src={src}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
        />

        <div className="pointer-events-none absolute inset-0 bg-black/10 transition-colors duration-300 group-hover:bg-black/45" />

        {overlay}
      </Link>
    );
  }

  function renderCollage() {
    if (visibleImages.length === 1) {
      return (
        <MediaTile
          src={first}
          alt={`${title} photo 1`}
          index={0}
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
            index={0}
            className="rounded-l-3xl"
          />

          <MediaTile
            src={second}
            alt={`${title} photo 2`}
            index={1}
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
            index={0}
            className="rounded-l-3xl"
          />

          <div className="grid min-h-0 grid-rows-2 gap-2">
            <MediaTile
              src={second}
              alt={`${title} photo 2`}
              index={1}
              className="rounded-tr-3xl"
            />

            <MediaTile
              src={third}
              alt={`${title} photo 3`}
              index={2}
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
            index={0}
            className="rounded-l-3xl"
          />

          <div className="grid min-h-0 grid-rows-2 gap-2">
            <MediaTile
              src={second}
              alt={`${title} photo 2`}
              index={1}
              className="rounded-tr-3xl"
            />

            <div className="grid min-h-0 grid-cols-2 gap-2">
              <MediaTile
                src={third}
                alt={`${title} photo 3`}
                index={2}
                className=""
              />

              <MediaTile
                src={fourth}
                alt={`${title} photo 4`}
                index={3}
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
            index={0}
            className="rounded-l-3xl"
          />

          <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-2">
            <MediaTile
              src={second}
              alt={`${title} photo 2`}
              index={1}
              className=""
            />

            <MediaTile
              src={third}
              alt={`${title} photo 3`}
              index={2}
              className="rounded-tr-3xl"
            />

            <MediaTile
              src={fourth}
              alt={`${title} photo 4`}
              index={3}
              className=""
            />

            <MediaTile
              src={fifth}
              alt={`${title} photo 5`}
              index={4}
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
          index={0}
          className="rounded-l-3xl"
        />

        <div className="grid min-h-0 grid-rows-2 gap-2">
          <div className="grid min-h-0 grid-cols-2 gap-2">
            <MediaTile
              src={second}
              alt={`${title} photo 2`}
              index={1}
              className=""
            />

            <MediaTile
              src={third}
              alt={`${title} photo 3`}
              index={2}
              className="rounded-tr-3xl"
            />
          </div>

          <div className="grid min-h-0 grid-cols-3 gap-2">
            <MediaTile
              src={fourth}
              alt={`${title} photo 4`}
              index={3}
              className=""
            />

            <MediaTile
              src={fifth}
              alt={`${title} photo 5`}
              index={4}
              className=""
            />

            <MediaTile
              src={visibleImages[5]}
              alt={`${title} photo 6`}
              index={5}
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

  return (
    <div className="relative h-[320px] min-h-0 overflow-hidden rounded-3xl sm:h-[360px] lg:h-[420px]">
      {renderCollage()}

      {mounted && visibleImages.length > 1 && (
        <Button
          asChild
          variant="secondary"
          className="absolute bottom-4 right-4 z-20 gap-2 rounded-full border border-border/70 bg-background/95 px-4 shadow-lg backdrop-blur hover:bg-background"
        >
          <Link href={galleryHref}>
            <Grid2x2 className="h-4 w-4" />
            Show all photos
          </Link>
        </Button>
      )}
    </div>
  );
}
