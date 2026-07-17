"use client";

/*
::neup.documentation::property-gallery-full-page

Renders the routed full-page property image gallery using the URL query as the initial selected image.

::end
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type GalleryDirection = "next" | "previous";

interface PropertyGalleryFullPageProps {
  images: string[];
  title: string;
  propertySlug: string;
  initialImage: number;
}

function clampImageIndex(value: number, length: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), Math.max(0, length - 1));
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
      <div className={`flex h-full w-full items-center justify-center rounded-2xl bg-neutral-900 text-sm text-white/65 ${className || ""}`}>
        No image
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export function PropertyGalleryFullPage({
  images,
  title,
  propertySlug,
  initialImage,
}: PropertyGalleryFullPageProps) {
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState(() =>
    clampImageIndex(initialImage - 1, images.length)
  );
  const [direction, setDirection] = useState<GalleryDirection>("next");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const visibleImages = useMemo(
    () =>
      images.filter(
        (image) =>
          typeof image === "string" && image.trim().length > 0
      ),
    [images]
  );

  const selectedImage = visibleImages[selectedIndex] ?? visibleImages[0] ?? "";
  const propertyHref = `/properties/${propertySlug}`;

  const copyPropertyLink = useCallback(async () => {
    const url = new URL(
      `/properties/${propertySlug}/gallery?mode=fullpage&image=${selectedIndex + 1}`,
      window.location.origin
    ).toString();

    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }, [propertySlug, selectedIndex]);

  const selectImage = useCallback(
    (index: number) => {
      const nextIndex = clampImageIndex(index, visibleImages.length);
      if (nextIndex === selectedIndex) return;

      setDirection(nextIndex > selectedIndex ? "next" : "previous");
      setSelectedIndex(nextIndex);
    },
    [selectedIndex, visibleImages.length]
  );

  const showPreviousImage = useCallback(() => {
    const nextIndex = selectedIndex === 0 ? visibleImages.length - 1 : selectedIndex - 1;
    setDirection("previous");
    setSelectedIndex(nextIndex);
  }, [selectedIndex, visibleImages.length]);

  const showNextImage = useCallback(() => {
    const nextIndex = selectedIndex === visibleImages.length - 1 ? 0 : selectedIndex + 1;
    setDirection("next");
    setSelectedIndex(nextIndex);
  }, [selectedIndex, visibleImages.length]);

  const handleTouchEnd = useCallback(
    (touchEndX: number) => {
      if (touchStartX === null) return;

      const deltaX = touchStartX - touchEndX;
      setTouchStartX(null);

      if (Math.abs(deltaX) < 48 || visibleImages.length < 2) return;

      if (deltaX > 0) {
        showNextImage();
        return;
      }

      showPreviousImage();
    },
    [showNextImage, showPreviousImage, touchStartX, visibleImages.length]
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(propertyHref);
      }

      if (event.key === "ArrowLeft" && visibleImages.length > 1) {
        showPreviousImage();
      }

      if (event.key === "ArrowRight" && visibleImages.length > 1) {
        showNextImage();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [propertyHref, router, showNextImage, showPreviousImage, visibleImages.length]);

  return (
    <main className="fixed inset-0 z-[9999] h-dvh w-screen overflow-hidden bg-neutral-950 text-white">
      <style>
        {`
          @keyframes property-gallery-slide-next {
            from { opacity: 0; transform: translateX(42px) scale(0.985); }
            to { opacity: 1; transform: translateX(0) scale(1); }
          }

          @keyframes property-gallery-slide-previous {
            from { opacity: 0; transform: translateX(-42px) scale(0.985); }
            to { opacity: 1; transform: translateX(0) scale(1); }
          }
        `}
      </style>

      <div className="absolute inset-x-0 top-0 z-20 flex h-14 items-center justify-between gap-4 px-3 sm:px-5">
        <p className="shrink-0 text-xs text-white/70">
          {selectedIndex + 1} / {visibleImages.length}
        </p>

        <div className="min-w-0 flex-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={copyPropertyLink}
          aria-label="Copy property link"
          className="h-9 w-11 shrink-0 rounded-lg text-white hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        </Button>

        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Close gallery"
          className="h-9 w-11 shrink-0 rounded-lg text-white hover:bg-white/10 hover:text-white"
        >
          <Link href={propertyHref}>
            <X className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      <div
        className="absolute inset-x-0 bottom-[5.25rem] top-14 flex items-center justify-center px-10 py-4 sm:px-16 sm:py-5"
        onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      >
        {visibleImages.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={showPreviousImage}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 z-10 h-10 w-12 -translate-y-1/2 rounded-lg bg-black/25 text-white hover:bg-white/15 hover:text-white sm:left-4"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}

        <div className="flex h-full w-full items-center justify-center">
          <GalleryImage
            key={`${selectedImage}-${selectedIndex}`}
            src={selectedImage}
            alt={`${title} photo ${selectedIndex + 1}`}
            className={`max-h-full max-w-full rounded-2xl object-contain shadow-2xl shadow-black/40 ${
              direction === "next"
                ? "[animation:property-gallery-slide-next_220ms_cubic-bezier(0.22,1,0.36,1)]"
                : "[animation:property-gallery-slide-previous_220ms_cubic-bezier(0.22,1,0.36,1)]"
            }`}
          />
        </div>

        {visibleImages.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={showNextImage}
            aria-label="Next image"
            className="absolute right-2 top-1/2 z-10 h-10 w-12 -translate-y-1/2 rounded-lg bg-black/25 text-white hover:bg-white/15 hover:text-white sm:right-4"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/55 px-2 py-2">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto">
          {visibleImages.map((src, index) => {
            const isSelected = index === selectedIndex;

            return (
              <button
                key={`${src}-${index}`}
                type="button"
                onClick={() => selectImage(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={isSelected ? "true" : undefined}
                className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border transition sm:h-16 sm:w-24 ${
                  isSelected
                    ? "border-white opacity-100"
                    : "border-white/20 opacity-65 hover:border-white/60 hover:opacity-100"
                }`}
              >
                <GalleryImage
                  src={src}
                  alt={`${title} thumbnail ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
